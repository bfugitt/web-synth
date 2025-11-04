/*
 * js/audioEngine.js
 * Contains all logic for the Web Audio API,
 * including sound generation, nodes, and effects.
 */

// Import the shared state and audio context
import { audioCtx, audioNodes, state } from './state.js';

// --- Audio Helper Functions ---
export function midiToFreq(midi) {
    return Math.pow(2, (midi - 69) / 12) * 440;
}
export function getVcoTune(vcoId) {
    const range = parseInt(document.getElementById(`${vcoId}-range`).value);
    const fineTune = parseFloat(document.getElementById(`${vcoId}-fine-tune`).value);
    return { range, fineTune };
}
export function getAdsr() {
    return {
        attack: parseFloat(document.getElementById('attack').value),
        decay: parseFloat(document.getElementById('decay').value),
        sustain: parseFloat(document.getElementById('sustain').value),
        release: parseFloat(document.getElementById('release').value)
    };
}

// --- Audio Chain Initialization ---
export function initializeGlobalAudioChain() {
    // 1. Master Output
    audioNodes.masterGainNode = audioCtx.createGain();
    audioNodes.masterGainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);

    // 2. Filter (VCF)
    audioNodes.vcfNode = audioCtx.createBiquadFilter();
    audioNodes.vcfNode.type = 'lowpass';
    audioNodes.vcfNode.frequency.setValueAtTime(10000, audioCtx.currentTime);
    audioNodes.vcfNode.Q.setValueAtTime(1.0, audioCtx.currentTime);
    
    // 3. Synth Output Mixer (feeds into VCF)
    audioNodes.synthOutputMixer = audioCtx.createGain();
    audioNodes.synthOutputMixer.connect(audioNodes.vcfNode);

    // 4. Delay Effect Nodes (Delay is now the *last* effect in the chain)
    audioNodes.delayNode = audioCtx.createDelay(2.0);
    audioNodes.feedbackGain = audioCtx.createGain();
    audioNodes.wetGain = audioCtx.createGain();
    audioNodes.dryGain = audioCtx.createGain();

    // --- NEW AUDIO ROUTING ---
    // The synth (VCF) output now feeds into the Distortion pedal's input
    // (We assume distortion nodes are created by effects.js, but we connect them here)
    // The distortion pedal's output will then feed into the Delay pedal's input.
    
    // 1. Synth (VCF) -> Distortion Input
    //    (We can't connect this yet, effects.js does it)
    //    Wait, no, effects.js creates them, this file connects them.
    
    // Let's re-think:
    // This file, audioEngine.js, is responsible for the *main chain*.
    // effects.js just creates/controls the nodes.

    // 1. Master Output
    audioNodes.masterGainNode = audioCtx.createGain();
    audioNodes.masterGainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);
    
    // 2. Filter (VCF)
    audioNodes.vcfNode = audioCtx.createBiquadFilter();
    // ... (settings as before) ...
    
    // 3. Synth Output Mixer
    audioNodes.synthOutputMixer = audioCtx.createGain();
    
    // 4. Delay Nodes
    audioNodes.delayNode = audioCtx.createDelay(2.0);
    audioNodes.feedbackGain = audioCtx.createGain();
    audioNodes.wetGain = audioCtx.createGain();
    audioNodes.dryGain = audioCtx.createGain();

    // --- ROUTING (NEW) ---
    // This is the main audio path
    
    // 1. Synth voices -> Mixer
    audioNodes.synthOutputMixer.connect(audioNodes.vcfNode);
    
    // 2. VCF -> Distortion Pedal (Input)
    //    (The distortion nodes are created in effects.js,
    //     so we just connect to its input)
    //    This is backwards. This file must create the nodes.
    
    // --- OK, FINAL PLAN (SIMPLER) ---
    // 1. Create ALL nodes here.
    // 2. Connect them.
    // 3. effects.js will just *control* them.
    
    // 1. Master Gain
    audioNodes.masterGainNode = audioCtx.createGain();
    audioNodes.masterGainNode.gain.setValueAtTime(0.7, audioCtx.currentTime);

    // 2. Synth Mixer & VCF
    audioNodes.synthOutputMixer = audioCtx.createGain();
    audioNodes.vcfNode = audioCtx.createBiquadFilter();
    audioNodes.vcfNode.type = 'lowpass';
    audioNodes.vcfNode.frequency.setValueAtTime(10000, audioCtx.currentTime);
    audioNodes.vcfNode.Q.setValueAtTime(1.0, audioCtx.currentTime);

    // 3. Distortion Pedal Nodes
    audioNodes.distortion = {
        input: audioCtx.createGain(),
        waveShaper: audioCtx.createWaveShaper(),
        wet: audioCtx.createGain(),
        dry: audioCtx.createGain(),
        output: audioCtx.createGain()
    };
    // Set distortion to OFF by default
    audioNodes.distortion.wet.gain.value = 0;
    audioNodes.distortion.dry.gain.value = 1;

    // 4. Delay Pedal Nodes
    audioNodes.delay = {
        input: audioCtx.createGain(), // We'll use this as the delay's input
        delayNode: audioCtx.createDelay(2.0),
        feedbackGain: audioCtx.createGain(),
        wetGain: audioCtx.createGain(),
        dryGain: audioCtx.createGain(),
        output: audioCtx.createGain() // And this as its output
    };
    
    // --- CONNECT THE FULL CHAIN ---
    
    // 1. Synth Voices -> Mixer -> VCF
    audioNodes.synthOutputMixer.connect(audioNodes.vcfNode);
    
    // 2. VCF -> Distortion Pedal
    audioNodes.vcfNode.connect(audioNodes.distortion.input);
    audioNodes.distortion.input.connect(audioNodes.distortion.dry).connect(audioNodes.distortion.output);
    audioNodes.distortion.input.connect(audioNodes.distortion.waveShaper).connect(audioNodes.distortion.wet).connect(audioNodes.distortion.output);

    // 3. Distortion Pedal -> Delay Pedal
    audioNodes.distortion.output.connect(audioNodes.delay.input);
    
    // 4. Inside Delay Pedal (from old setup)
    audioNodes.delay.input.connect(audioNodes.delay.delayNode); // wet path
    audioNodes.delay.delayNode.connect(audioNodes.delay.feedbackGain);
    audioNodes.delay.feedbackGain.connect(audioNodes.delay.delayNode);
    audioNodes.delay.delayNode.connect(audioNodes.delay.wetGain);
    audioNodes.delay.wetGain.connect(audioNodes.delay.output);
    
    audioNodes.delay.input.connect(audioNodes.delay.dryGain); // dry path
    audioNodes.delay.dryGain.connect(audioNodes.delay.output);
    
    // 5. Delay Pedal (Output) -> Master Volume -> Speakers
    audioNodes.delay.output.connect(audioNodes.masterGainNode);
    audioNodes.masterGainNode.connect(audioCtx.destination);

    // Initialize parameters
    updateDelay();
    updateVCF();
}

export function updateVCF() {
    const time = audioCtx.currentTime;
    audioNodes.vcfNode.frequency.linearRampToValueAtTime(parseFloat(document.getElementById('cutoff').value), time + 0.01);
    audioNodes.vcfNode.Q.linearRampToValueAtTime(parseFloat(document.getElementById('resonance').value), time + 0.01);
}

export function updateDelay() {
    const time = parseFloat(document.getElementById('delay-time').value);
    const feedback = parseFloat(document.getElementById('delay-feedback').value);
    const mix = parseFloat(document.getElementById('delay-mix').value);
    const currentTime = audioCtx.currentTime;

    audioNodes.delay.delayNode.delayTime.linearRampToValueAtTime(time, currentTime + 0.01);
    audioNodes.delay.feedbackGain.gain.linearRampToValueAtTime(feedback, currentTime + 0.01);
    audioNodes.delay.dryGain.gain.linearRampToValueAtTime(1.0 - mix, currentTime + 0.01);
    audioNodes.delay.wetGain.gain.linearRampToValueAtTime(mix, currentTime + 0.01);
}

// --- LFO Functions ---
export function createLfoNode(context, rate, wave, startTime) {
    const lfo = context.createOscillator();
    lfo.type = wave;
    lfo.frequency.setValueAtTime(rate, startTime);
    return lfo;
}
export function initRealTimeLfo() {
    if (audioNodes.realTimeLfoNode) {
        try {
            audioNodes.realTimeLfoNode.stop();
        } catch (e) { /* node might already be stopped */ }
    }
    
    state.lfoRate = parseFloat(document.getElementById('lfo-rate').value);
    state.lfoWave = document.getElementById('lfo-wave').value;
    const lfoVcfDepth = parseFloat(document.getElementById('lfo-vcf-depth').value);

    if (lfoVcfDepth > 0) {
        audioNodes.realTimeLfoNode = createLfoNode(audioCtx, state.lfoRate, state.lfoWave, audioCtx.currentTime);
        
        audioNodes.lfoVcfDepthParam = audioCtx.createGain();
        audioNodes.lfoVcfDepthParam.gain.setValueAtTime(lfoVcfDepth, audioCtx.currentTime);
        
        audioNodes.realTimeLfoNode.connect(audioNodes.lfoVcfDepthParam);
        audioNodes.lfoVcfDepthParam.connect(audioNodes.vcfNode.frequency);
        
        audioNodes.realTimeLfoNode.start(audioCtx.currentTime);
    }
}
export function updateLFO(value, param, valEl = null) {
    if (param === 'rate') {
        state.lfoRate = parseFloat(value);
        if (audioNodes.realTimeLfoNode) {
            audioNodes.realTimeLfoNode.frequency.linearRampToValueAtTime(state.lfoRate, audioCtx.currentTime + 0.01);
        }
        if (valEl) valEl.textContent = state.lfoRate.toFixed(2) + ' Hz';
    } else if (param === 'wave') {
        state.lfoWave = value;
        if (audioNodes.realTimeLfoNode) {
            audioNodes.realTimeLfoNode.type = state.lfoWave;
        }
    }
    if (parseFloat(document.getElementById('lfo-vcf-depth').value) > 0) {
       initRealTimeLfo();
    }
}

// --- Core Note On/Off Functions ---
export function startNote(midiNote) {
    while (state.activeVoices[midiNote] && state.activeVoices[midiNote].length > 0) {
        stopNote(midiNote, true); 
    }
    
    const freq = midiToFreq(midiNote);
    const { attack, decay, sustain } = getAdsr();
    const startTime = audioCtx.currentTime;
    const tune1 = getVcoTune('vco1');
    const tune2 = getVcoTune('vco2');
    const vco1Level = parseFloat(document.getElementById('vco1-level').value);
    const vco2Level = parseFloat(document.getElementById('vco2-level').value);
    const noiseLevel = parseFloat(document.getElementById('noise-level').value);
    const lfoVco1Depth = parseFloat(document.getElementById('lfo-vco1-depth').value) * 100;
    const lfoVco2Depth = parseFloat(document.getElementById('lfo-vco2-depth').value) * 100;

    const noteGain = audioCtx.createGain();
    noteGain.gain.setValueAtTime(0, startTime);
    noteGain.gain.linearRampToValueAtTime(1.0, startTime + attack);
    noteGain.gain.setTargetAtTime(sustain, startTime + attack + decay, decay * 0.2);
    
    // Connect this note's output to the main synth mixer
    noteGain.connect(audioNodes.synthOutputMixer);

    const voiceMixer = audioCtx.createGain();
    voiceMixer.connect(noteGain);

    let voiceNodes = [noteGain, voiceMixer];
    
    if (vco1Level > 0) {
        const vco1Node = audioCtx.createOscillator();
        vco1Node.type = state.vco1Wave;
        const vco1FinalFreq = freq * Math.pow(2, (tune1.range + tune1.fineTune) / 12);
        vco1Node.frequency.setValueAtTime(vco1FinalFreq, startTime);
        
        const vco1Gain = audioCtx.createGain();
        vco1Gain.gain.setValueAtTime(vco1Level, startTime);
        vco1Node.connect(vco1Gain);
        vco1Gain.connect(voiceMixer);
        
        if (lfoVco1Depth > 0) {
            const lfo1 = createLfoNode(audioCtx, state.lfoRate, state.lfoWave, startTime);
            const lfo1Gain = audioCtx.createGain();
            lfo1Gain.gain.setValueAtTime(lfoVco1Depth, startTime);
            lfo1.connect(lfo1Gain);
            lfo1Gain.connect(vco1Node.detune);
            lfo1.start(startTime);
            voiceNodes.push(lfo1, lfo1Gain);
        }
        
        vco1Node.start(startTime);
        voiceNodes.push(vco1Node, vco1Gain);
    }
    
    if (vco2Level > 0) {
        const vco2Node = audioCtx.createOscillator();
        vco2Node.type = state.vco2Wave;
        const vco2FinalFreq = freq * Math.pow(2, (tune2.range + tune2.fineTune) / 12);
        vco2Node.frequency.setValueAtTime(vco2FinalFreq, startTime);
        
        const vco2Gain = audioCtx.createGain();
        vco2Gain.gain.setValueAtTime(vco2Level, startTime);
        vco2Node.connect(vco2Gain);
        vco2Gain.connect(voiceMixer);

        if (lfoVco2Depth > 0) {
            const lfo2 = createLfoNode(audioCtx, state.lfoRate, state.lfoWave, startTime);
            const lfo2Gain = audioCtx.createGain();
            lfo2Gain.gain.setValueAtTime(lfoVco2Depth, startTime);
            lfo2.connect(lfo2Gain);
            lfo2Gain.connect(vco2Node.detune);
            lfo2.start(startTime);
            voiceNodes.push(lfo2, lfo2Gain);
        }
        
        vco2Node.start(startTime);
        voiceNodes.push(vco2Node, vco2Gain);
    }
    
    if (noiseLevel > 0) {
        const bufferSize = audioCtx.sampleRate * 2;
        const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
        const output = buffer.getChannelData(0);
        for (let i = 0; i < bufferSize; i++) {
            output[i] = Math.random() * 2 - 1;
        }
        
        const noiseNode = audioCtx.createBufferSource();
        noiseNode.buffer = buffer;
        noiseNode.loop = true;
        
        const noiseGain = audioCtx.createGain();
        noiseGain.gain.setValueAtTime(noiseLevel, startTime);
        noiseNode.connect(noiseGain);
        noiseGain.connect(voiceMixer);
        
        noiseNode.start(startTime);
        voiceNodes.push(noiseNode, noiseGain);
    }

    if (!state.activeVoices[midiNote]) {
        state.activeVoices[midiNote] = [];
    }
    state.activeVoices[midiNote].push(voiceNodes);
}
export function stopNote(midiNote, immediate = false) {
    if (!state.activeVoices[midiNote] || state.activeVoices[midiNote].length === 0) {
        return;
    }

    const { release } = getAdsr();
    const stopTime = audioCtx.currentTime;
    
    const voiceNodes = state.activeVoices[midiNote].shift();
    const noteGain = voiceNodes[0];

    if (immediate) {
        noteGain.gain.cancelScheduledValues(stopTime);
        noteGain.gain.setValueAtTime(0, stopTime);
    } else {
        noteGain.gain.cancelScheduledValues(stopTime);
        noteGain.gain.setTargetAtTime(0, stopTime, release * 0.2);
    }

    const fadeOutTime = immediate ? 0.01 : release + 0.5;
    
    voiceNodes.forEach((node, index) => {
        if (index > 0) {
            if (node.stop) {
                try { node.stop(stopTime + fadeOutTime); } catch (e) { /* already stopped */ }
            }
            try { node.disconnect(); } catch (e) { /* already disconnected */ }
        }
    });
    
    setTimeout(() => {
        try { noteGain.disconnect(); } catch (e) { /* already disconnected */ }
    }, (fadeOutTime + 0.1) * 1000);
}
