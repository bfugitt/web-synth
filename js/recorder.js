/*
 * js/recorder.js
 * Handles recording the sequence/song to a WAV file.
 */

import { state, audioCtx } from './state.js';
import { SCALES, REVERB_IR_BASE64 } from './constants.js';
import { getAllSynthState } from './patch.js';
import { midiToFreq, createLfoNode, makeDistortionCurve } from './audioEngine.js';

let _stopSong;
export function initRecorder(stopSongFn) {
    _stopSong = stopSongFn;
}

// --- DUPLICATED from effects.js ---
// Helper to decode the reverb IR
function _base64ToArrayBuffer(base64) {
    const base64Data = base64.split(',')[1];
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}
// --- END DUPLICATE ---

function bufferToWav(monoData, sampleRate) {
    // ... (This function is unchanged)
    const numChannels = 1;
    const numSamples = monoData.length;
    const dataLength = numSamples * numChannels * 2;
    const buffer = new ArrayBuffer(44 + dataLength);
    const view = new DataView(buffer);
    function writeString(view, offset, string) {
        for (let i = 0; i < string.length; i++) {
            view.setUint8(offset + i, string.charCodeAt(i));
        }
    }
    let offset = 0;
    writeString(view, offset, 'RIFF'); offset += 4;
    view.setUint32(offset, 36 + dataLength, true); offset += 4;
    writeString(view, offset, 'WAVE'); offset += 4;
    writeString(view, offset, 'fmt '); offset += 4;
    view.setUint32(offset, 16, true); offset += 4;
    view.setUint16(offset, 1, true); offset += 2;
    view.setUint16(offset, numChannels, true); offset += 2;
    view.setUint32(offset, sampleRate, true); offset += 4;
    view.setUint32(offset, sampleRate * numChannels * 2, true); offset += 4;
    view.setUint16(offset, numChannels * 2, true); offset += 2;
    view.setUint16(offset, 16, true); offset += 2;
    writeString(view, offset, 'data'); offset += 4;
    view.setUint32(offset, dataLength, true); offset += 4;
    for (let i = 0; i < numSamples; i++) {
        const s = Math.max(-1, Math.min(1, monoData[i]));
        const val = s < 0 ? s * 0x8000 : s * 0x7FFF;
        view.setInt16(offset, val, true);
        offset += 2;
    }
    return new Blob([view], { type: 'audio/wav' });
}

function createOfflineVoice(context, patchState, midiNote, startTime, duration, destination) {
    // ... (This function is unchanged)
    const freq = midiToFreq(midiNote);
    const { attack, decay, sustain } = patchState;
    const tune1Range = parseInt(patchState.vco1_range);
    const tune1Fine = parseFloat(patchState.vco1_fine_tune);
    const tune2Range = parseInt(patchState.vco2_range);
    const tune2Fine = parseFloat(patchState.vco2_fine_tune);
    const vco1Level = parseFloat(patchState.vco1_level);
    const vco2Level = parseFloat(patchState.vco2_level);
    const noiseLevel = parseFloat(patchState.noise_level);
    const lfoRate = parseFloat(patchState.lfo_rate);
    const lfoWave = patchState.lfo_wave;
    const lfoVco1Depth = parseFloat(patchState.lfo_vco1_depth) * 100;
    const lfoVco2Depth = parseFloat(patchState.lfo_vco2_depth) * 100;
    const needsLfo = lfoVco1Depth > 0 || lfoVco2Depth > 0;
    const lfoNode = needsLfo ? createLfoNode(context, lfoRate, lfoWave, startTime) : null;
    if(lfoNode) lfoNode.start(startTime);
    const noteGain = context.createGain();
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(1.0, startTime + parseFloat(attack));
    noteGain.gain.setTargetAtTime(parseFloat(sustain), startTime + parseFloat(attack) + parseFloat(decay), parseFloat(decay) * 0.2);
    const voiceMixer = context.createGain();
    if (vco1Level > 0) {
        const vco1Node = context.createOscillator();
        vco1Node.type = patchState.vco1_wave;
        const vco1FinalFreq = freq * Math.pow(2, (tune1Range + tune1Fine) / 12);
        vco1Node.frequency.setValueAtTime(vco1FinalFreq, startTime);
        const vco1Gain = context.createGain();
        vco1Gain.gain.setValueAtTime(vco1Level, startTime);
        vco1Node.connect(vco1Gain);
        vco1Gain.connect(voiceMixer);
        if (lfoVco1Depth > 0) {
            const lfo1Gain = context.createGain();
            lfo1Gain.gain.setValueAtTime(lfoVco1Depth, startTime);
            lfoNode.connect(lfo1Gain);
            lfo1Gain.connect(vco1Node.detune);
        }
        vco1Node.start(startTime);
        vco1Node.stop(startTime + duration + parseFloat(patchState.release) + 0.01);
    }
    if (vco2Level > 0) {
        const vco2Node = context.createOscillator();
        vco2Node.type = patchState.vco2_wave;
        const vco2FinalFreq = freq * Math.pow(2, (tune2Range + tune2Fine) / 12);
        vco2Node.frequency.setValueAtTime(vco2FinalFreq, startTime);
        const vco2Gain = context.createGain();
        vco2Gain.gain.setValueAtTime(vco2Level, startTime);
        vco2Node.connect(vco2Gain);
        vco2Gain.connect(voiceMixer);
        if (lfoVco2Depth > 0) {
            const lfo2Gain = context.createGain();
            lfo2Gain.gain.setValueAtTime(lfoVco2Depth, startTime);
            lfoNode.connect(lfo2Gain);
            lfo2Gain.connect(vco2Node.detune);
        }
        vco2Node.start(startTime);
        vco2Node.stop(startTime + duration + parseFloat(patchState.release) + 0.01);
    }
    if (noiseLevel > 0) {
        const bufferSize = context.sampleRate * 2;
        const buffer = context.createBuffer(1, bufferSize, context.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        const noiseNode = context.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.loop = true;
        const noiseGain = context.createGain();
        noiseGain.gain.setValueAtTime(noiseLevel, startTime);
        noiseNode.connect(noiseGain);
        noiseGain.connect(voiceMixer);
        noiseNode.start(startTime);
        noiseNode.stop(startTime + duration + parseFloat(patchState.release) + 0.01);
    }
    voiceMixer.connect(noteGain);
    noteGain.connect(destination);
    const releaseTime = parseFloat(patchState.release);
    noteGain.gain.cancelScheduledValues(startTime + duration);
    noteGain.gain.setTargetAtTime(0, startTime + duration, releaseTime * 0.2);
    if (lfoNode) {
        lfoNode.stop(startTime + duration + releaseTime + 0.01);
    }
}

export async function startRecording() {
    const recordBtn = document.getElementById('record-btn');
    recordBtn.disabled = true;
    document.getElementById('loading-overlay').style.display = 'flex';
    
    let totalTimeSec = 0;
    let patternsToRecord = [];
    
    const hasSong = state.songPatterns.length > 0;
    const fileNamePrefix = hasSong ? 'Song' : 'Pattern';

    try {
        if (hasSong) {
            alert("Recording the full song chain...");
            if (state.isSongPlaying && _stopSong) _stopSong();
            patternsToRecord = state.songPatterns;
        } else {
            alert("No song found. Recording current pattern...");
            const currentPattern = {
                name: "Current Pattern",
                state: getAllSynthState(),
                sequence: state.sequence.map(row => [...row])
            };
            patternsToRecord = [currentPattern];
        }
        
        const NUM_STEPS = 16;
        patternsToRecord.forEach(pattern => {
            const bpm = parseInt(pattern.state.bpm) || 120;
            const timePerStepSec = (60 / bpm) / 4;
            const patternDuration = NUM_STEPS * timePerStepSec;
            pattern.duration = patternDuration;
            pattern.timePerStepSec = timePerStepSec;
            totalTimeSec += patternDuration;
        });

        if (totalTimeSec === 0 || patternsToRecord.length === 0) {
            // ... (error handling as before) ...
            recordBtn.disabled = false;
            document.getElementById('loading-overlay').style.display = 'none';
            alert("No notes or patterns to record.");
            return;
        }

        const sampleRate = audioCtx.sampleRate;
        const offlineCtx = new OfflineAudioContext(1, totalTimeSec * sampleRate, sampleRate);

        // --- REBUILD THE *ENTIRE* AUDIO CHAIN OFFLINE ---

        // 1. Master Gain
        const masterGainNodeOffline = offlineCtx.createGain();
        
        // 2. Synth Mixer & VCF
        const synthOutputMixerOffline = offlineCtx.createGain();
        const vcfNodeOffline = offlineCtx.createBiquadFilter();
        vcfNodeOffline.type = 'lowpass';

        // 3. Distortion Pedal
        const distortionOffline = {
            input: offlineCtx.createGain(),
            waveShaper: offlineCtx.createWaveShaper(),
            wet: offlineCtx.createGain(),
            dry: offlineCtx.createGain(),
            output: offlineCtx.createGain()
        };
        distortionOffline.waveShaper.oversample = '4x';

        // 4. Delay Pedal
        const delayOffline = {
            input: offlineCtx.createGain(),
            delayNode: offlineCtx.createDelay(2.0),
            feedbackGain: offlineCtx.createGain(),
            wetGain: offlineCtx.createGain(),
            dryGain: offlineCtx.createGain(),
            output: offlineCtx.createGain()
        };

        // 5. Reverb Pedal
        const reverbOffline = {
            input: offlineCtx.createGain(),
            convolver: offlineCtx.createConvolver(),
            wet: offlineCtx.createGain(),
            dry: offlineCtx.createGain(),
            output: offlineCtx.createGain()
        };

        // 6. Load the Reverb IR (must be done before rendering)
        console.log('Loading Offline Reverb IR...');
        const irAudioData = _base64ToArrayBuffer(REVERB_IR_BASE64);
        const reverbBuffer = await offlineCtx.decodeAudioData(irAudioData);
        reverbOffline.convolver.buffer = reverbBuffer;
        console.log('Offline Reverb IR loaded.');

        // --- CONNECT THE OFFLINE CHAIN ---
        synthOutputMixerOffline.connect(vcfNodeOffline);
        vcfNodeOffline.connect(distortionOffline.input);
        // Dist chain
        distortionOffline.input.connect(distortionOffline.dry).connect(distortionOffline.output);
        distortionOffline.input.connect(distortionOffline.waveShaper).connect(distortionOffline.wet).connect(distortionOffline.output);
        // Dist -> Delay
        distortionOffline.output.connect(delayOffline.input);
        // Delay chain
        delayOffline.input.connect(delayOffline.delayNode).connect(delayOffline.feedbackGain).connect(delayOffline.delayNode);
        delayOffline.delayNode.connect(delayOffline.wetGain).connect(delayOffline.output);
        delayOffline.input.connect(delayOffline.dryGain).connect(delayOffline.output);
        // Delay -> Reverb
        delayOffline.output.connect(reverbOffline.input);
        // Reverb chain
        reverbOffline.input.connect(reverbOffline.dry).connect(reverbOffline.output);
        reverbOffline.input.connect(reverbOffline.convolver).connect(reverbOffline.wet).connect(reverbOffline.output);
        // Reverb -> Master
        reverbOffline.output.connect(masterGainNodeOffline);
        masterGainNodeOffline.connect(offlineCtx.destination);
        
        // --- End Chain Rebuild ---

        let currentTime = 0;
        const NUM_ROWS = 8;
        
        for (const pattern of patternsToRecord) {
            const patchState = pattern.state;
            const sequenceToRender = pattern.sequence;
            const timePerStepSec = pattern.timePerStepSec;
            
            // --- SET ALL AUDIO PARAMS FOR THIS PATTERN ---
            const now = currentTime;
            
            // Master Volume
            masterGainNodeOffline.gain.linearRampToValueAtTime(parseFloat(patchState.master_volume), now);
            
            // VCF
            vcfNodeOffline.frequency.linearRampToValueAtTime(parseFloat(patchState.cutoff), now);
            vcfNodeOffline.Q.linearRampToValueAtTime(parseFloat(patchState.resonance), now);
            
            // Distortion
            distortionOffline.waveShaper.curve = makeDistortionCurve(parseFloat(patchState.distortion_amount));
            if (patchState.distortion_on) {
                distortionOffline.wet.gain.linearRampToValueAtTime(1, now);
                distortionOffline.dry.gain.linearRampToValueAtTime(0, now);
            } else {
                distortionOffline.wet.gain.linearRampToValueAtTime(0, now);
                distortionOffline.dry.gain.linearRampToValueAtTime(1, now);
            }

            // Delay
            delayOffline.delayNode.delayTime.linearRampToValueAtTime(parseFloat(patchState.delay_time), now);
            delayOffline.feedbackGain.gain.linearRampToValueAtTime(parseFloat(patchState.delay_feedback), now);
            if (patchState.delay_on) {
                const mix = parseFloat(patchState.delay_mix);
                delayOffline.wetGain.gain.linearRampToValueAtTime(mix, now);
                delayOffline.dryGain.gain.linearRampToValueAtTime(1.0 - mix, now);
            } else {
                delayOffline.wetGain.gain.linearRampToValueAtTime(0, now);
                delayOffline.dryGain.gain.linearRampToValueAtTime(1, now);
            }

            // Reverb
            if (patchState.reverb_on) {
                const mix = parseFloat(patchState.reverb_mix);
                reverbOffline.wet.gain.linearRampToValueAtTime(mix, now);
                reverbOffline.dry.gain.linearRampToValueAtTime(1.0 - mix, now);
            } else {
                reverbOffline.wet.gain.linearRampToValueAtTime(0, now);
                reverbOffline.dry.gain.linearRampToValueAtTime(1, now);
            }
            
            // --- Schedule Notes ---
            const scaleKey = patchState.scale_key || 'major';
            const scaleOffsets = SCALES[scaleKey].offsets;
            const baseOctave = parseInt(patchState.baseOctave) || 60;
            const offlineScaleNotes = scaleOffsets.slice(0, NUM_ROWS)
                .map(offset => baseOctave + offset)
                .reverse();
            
            for (let step = 0; step < NUM_STEPS; step++) {
                const stepTime = currentTime + (step * timePerStepSec);
                
                for (let row = 0; row < NUM_ROWS; row++) {
                    if (sequenceToRender[row][step]) {
                        const midiNote = offlineScaleNotes[row];
                        const noteDuration = timePerStepSec * 0.9;
                        
                        // Pass the synthOutputMixerOffline as the destination
                        createOfflineVoice(offlineCtx, patchState, midiNote, stepTime, noteDuration, synthOutputMixerOffline);
                    }
                }
            }
            
            currentTime += pattern.duration; // Advance time
        }

        // ... (rest of the function is unchanged) ...
        
        if (currentTime === 0) {
            throw new Error("No notes were scheduled for rendering.");
        }
        
        const renderedBuffer = await offlineCtx.startRendering();
        
        const monoData = renderedBuffer.getChannelData(0);
        const wavBlob = bufferToWav(monoData, sampleRate);
        const url = URL.createObjectURL(wavBlob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = `${fileNamePrefix}_${patternsToRecord.length}patterns_${new Date().toISOString().slice(0, 10)}.wav`;
        a.click();
        URL.revokeObjectURL(url);

    } catch (error) {
        console.error("Recording failed:", error);
        document.getElementById('loading-overlay').innerHTML = '<p>Recording failed. Check console for details.</p><button onclick="document.getElementById(\'loading-overlay\').style.display=\'none\'" style="margin-top: 20px; padding: 10px 20px; background: #f44336; color: white; border: none; border-radius: 4px; border-radius: 8px;">Close</button>';
    } finally {
        if (document.getElementById('loading-overlay').style.display !== 'none') {
            document.getElementById('loading-overlay').style.display = 'none';
        }
        recordBtn.disabled = false;
    }
}
