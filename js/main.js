// Import all our static data from the constants.js file
import { MIDI_NOTE_NAMES, SCALES, ARP_CHORD_INTERVALS, PATCHES } from './constants.js';
// Import all our "live" state variables and audio nodes
import { audioCtx, audioNodes, state } from './state.js';
// Import all our audio functions
import { 
    midiToFreq,
    getVcoTune,
    getAdsr,
    initializeGlobalAudioChain,
    updateVCF,
    updateDelay,
    createLfoNode,
    initRealTimeLfo,
    updateLFO,
    startNote,
    stopNote
} from './audioEngine.js';


// --- Helper Functions (that are NOT audio-related) ---
function updateRangeLabel(input, unit = '') {
    const valEl = document.getElementById(input.id + '-val');
    if (valEl) {
        valEl.textContent = input.value + unit;
    }
}
function updateAllRangeLabels() {
    document.querySelectorAll('input[type="range"]').forEach(input => {
        let suffix = '';
        if (input.id.includes('attack') || input.id.includes('decay') || input.id.includes('release') || input.id.includes('delay-time')) {
            suffix = 's';
        } else if (input.id.includes('cutoff') || input.id.includes('lfo-vcf-depth')) {
            suffix = ' Hz';
        } else if (input.id.includes('lfo-vco')) {
            suffix = ' semitones';
        } else if (input.id.includes('lfo-rate')) {
            suffix = ' Hz';
        }
        updateRangeLabel(input, suffix);
    });
}
// Get all current synth parameters (for saving/loading)
function getAllSynthState() {
    return {
        // VCOs
        vco1_wave: document.getElementById('vco1-wave').value,
        vco1_range: document.getElementById('vco1-range').value,
        vco1_fine_tune: document.getElementById('vco1-fine-tune').value,
        vco1_level: document.getElementById('vco1-level').value,
        vco2_wave: document.getElementById('vco2-wave').value,
        vco2_range: document.getElementById('vco2-range').value,
        vco2_fine_tune: document.getElementById('vco2-fine-tune').value,
        vco2_level: document.getElementById('vco2-level').value,
        // ADSR
        attack: document.getElementById('attack').value,
        decay: document.getElementById('decay').value,
        sustain: document.getElementById('sustain').value,
        release: document.getElementById('release').value,
        // VCF
        cutoff: document.getElementById('cutoff').value,
        resonance: document.getElementById('resonance').value,
        lfo_vcf_depth: document.getElementById('lfo-vcf-depth').value,
        // LFO
        lfo_rate: document.getElementById('lfo-rate').value,
        lfo_wave: document.getElementById('lfo-wave').value,
        lfo_vco1_depth: document.getElementById('lfo-vco1-depth').value,
        lfo_vco2_depth: document.getElementById('lfo-vco2-depth').value,
        // Noise
        noise_level: document.getElementById('noise-level').value,
        // Delay
        delay_time: document.getElementById('delay-time').value,
        delay_feedback: document.getElementById('delay-feedback').value,
        delay_mix: document.getElementById('delay-mix').value,
        // Master
        master_volume: document.getElementById('master-volume').value,
        // Arp
        arp_mode: document.getElementById('arp-mode').value,
        arp_rate: document.getElementById('arp-rate').value,
        arp_chords: document.getElementById('arp-chords').value,
        arp_octaves: document.getElementById('arp-octaves').value,
        // Transport
        bpm: document.getElementById('bpm-input').value,
        // Scale
        scale_key: document.getElementById('scale-selector').value
    };
}
function loadSynthControls(patchState) {
    const controls = [
        { id: 'vco1-wave', key: 'vco1_wave' },
        { id: 'vco1-range', key: 'vco1_range' },
        { id: 'vco1-fine-tune', key: 'vco1_fine_tune' },
        { id: 'vco1-level', key: 'vco1_level' },
        { id: 'vco2-wave', key: 'vco2_wave' },
        { id: 'vco2-range', key: 'vco2_range' },
        { id: 'vco2-fine-tune', key: 'vco2_fine_tune' },
        { id: 'vco2-level', key: 'vco2_level' },
        { id: 'attack', key: 'attack' },
        { id: 'decay', key: 'decay' },
        { id: 'sustain', key: 'sustain' },
        { id: 'release', key: 'release' },
        { id: 'cutoff', key: 'cutoff' },
        { id: 'resonance', key: 'resonance' },
        { id: 'lfo-vcf-depth', key: 'lfo_vcf_depth' },
        { id: 'lfo-rate', key: 'lfo_rate' },
        { id: 'lfo-wave', key: 'lfo_wave' },
        { id: 'lfo-vco1-depth', key: 'lfo_vco1_depth' },
        { id: 'lfo-vco2-depth', key: 'lfo_vco2_depth' },
        { id: 'noise-level', key: 'noise_level' },
        { id: 'delay-time', key: 'delay_time' },
        { id: 'delay-feedback', key: 'delay_feedback' },
        { id: 'delay-mix', key: 'delay_mix' },
        { id: 'master-volume', key: 'master_volume' },
        { id: 'arp-mode', key: 'arp_mode' },
        { id: 'arp-rate', key: 'arp_rate' },
        { id: 'arp-chords', key: 'arp_chords' },
        { id: 'arp-octaves', key: 'arp_octaves' },
        { id: 'bpm-input', key: 'bpm' },
        { id: 'scale-selector', key: 'scale_key' }
    ];

    controls.forEach(control => {
        if (patchState[control.key] !== undefined) {
            const el = document.getElementById(control.id);
            if (el) {
                el.value = patchState[control.key];
            }
        }
    });

    // Update global state variables
    state.vco1Wave = patchState.vco1_wave;
    state.vco2Wave = patchState.vco2_wave;
    
    // Update dependent systems
    updateAllRangeLabels();
    updateVCF();
    updateDelay();
    updateLFO(patchState.lfo_rate, 'rate');
    updateLFO(patchState.lfo_wave, 'wave');
    initRealTimeLfo();
    audioNodes.masterGainNode.gain.setValueAtTime(parseFloat(patchState.master_volume), audioCtx.currentTime);

    if (patchState.scale_key) {
        document.getElementById('scale-selector').value = patchState.scale_key;
        loadScale(); // This will redraw the grid
    }
}

// --- Keyboard and Arp Interaction ---
function updateHeldNotes(midiNote, isAdding) {
    const index = state.heldNotes.indexOf(midiNote);
    if (isAdding && index === -1) {
        state.heldNotes.push(midiNote);
    } else if (!isAdding && index > -1) {
        state.heldNotes.splice(index, 1);
    }
    state.heldNotes.sort((a, b) => a - b); // Keep notes sorted

    const arpMode = document.getElementById('arp-mode').value;
    if (arpMode !== 'off' && !state.isPlaying) {
        if (state.heldNotes.length > 0) {
            startArpeggiator();
        } else {
            stopArpeggiator();
        }
    }
}

function noteOn(midiNote) {
    if (state.isPlaying) return;
    
    const arpMode = document.getElementById('arp-mode').value;
    if (arpMode === 'off') {
        startNote(midiNote);
    }
    updateHeldNotes(midiNote, true);
}

function noteOff(midiNote) {
    const arpMode = document.getElementById('arp-mode').value;
    if (arpMode === 'off') {
        stopNote(midiNote);
    }
    updateHeldNotes(midiNote, false);
}

// --- Arpeggiator Functions (UPDATED) ---
function getArpParams() {
    return {
        mode: document.getElementById('arp-mode').value,
        rateFactor: parseInt(document.getElementById('arp-rate').value),
        octaves: parseInt(document.getElementById('arp-octaves').value),
        chordSequence: document.getElementById('arp-chords').value
    };
}

function calculateArpNote(notes, index, mode, octaves, chordSequence) {
    if (notes.length === 0) return null;
    
    const rootNote = notes[0];
    const intervals = ARP_CHORD_INTERVALS[chordSequence];
    
    if (chordSequence === 'held_notes' || !intervals) {
        const totalHeldNotes = notes.length;
        const totalArpNotes = totalHeldNotes * octaves;
        if (totalArpNotes === 0) return null;
        
        let effectiveIndex;
        
        switch (mode) {
            case 'up':
                effectiveIndex = index % totalArpNotes;
                break;
            case 'down':
                effectiveIndex = totalArpNotes - 1 - (index % totalArpNotes);
                break;
            case 'updown':
                const cycleLength = totalArpNotes * 2 - 2;
                if (cycleLength <= 0) { 
                    effectiveIndex = 0; 
                    break;
                }
                const pos = index % cycleLength;
                effectiveIndex = pos < totalArpNotes ? pos : (cycleLength - pos);
                break;
            case 'random':
                effectiveIndex = Math.floor(Math.random() * totalArpNotes);
                break;
            default:
                effectiveIndex = 0;
        }
        
        const noteIndex = effectiveIndex % totalHeldNotes;
        const octaveOffset = Math.floor(effectiveIndex / totalHeldNotes) * 12;
        return notes[noteIndex] + octaveOffset;

    } else {
        const totalIntervals = intervals.length;
        const totalArpNotes = totalIntervals * octaves;
        if (totalArpNotes === 0) return null;
        
        let effectiveIndex;

        switch (mode) {
            case 'up':
                effectiveIndex = index % totalArpNotes;
                break;
            case 'down':
                effectiveIndex = totalArpNotes - 1 - (index % totalArpNotes);
                break;
            case 'updown':
                const cycleLength = totalArpNotes * 2 - 2;
                if (cycleLength <= 0) { 
                    effectiveIndex = 0; 
                    break; 
                }
                const pos = index % cycleLength;
                effectiveIndex = pos < totalArpNotes ? pos : (cycleLength - pos);
                break;
            case 'random':
                effectiveIndex = Math.floor(Math.random() * totalArpNotes);
                break;
            default:
                effectiveIndex = 0;
        }

        const intervalIndex = effectiveIndex % totalIntervals;
        const octaveOffset = Math.floor(effectiveIndex / totalIntervals) * 12;
        return rootNote + intervals[intervalIndex] + octaveOffset;
    }
}

function runArpStep() {
    const { mode, rateFactor } = getArpParams();
    const bpm = parseInt(document.getElementById('bpm-input').value) || 120;
    const noteDurationSec = (60.0 / bpm / 4) / rateFactor;
    const noteDurationMs = noteDurationSec * 1000;
    
    if (mode === 'off' || state.heldNotes.length === 0 || state.isPlaying) {
        stopArpeggiator();
        return;
    }

    Object.keys(state.activeVoices).forEach(note => {
        while (state.activeVoices[note] && state.activeVoices[note].length > 0) {
            stopNote(parseInt(note));
        }
    });

    const { octaves, chordSequence } = getArpParams();
    const noteToPlay = calculateArpNote(state.heldNotes, state.arpIndex, mode, octaves, chordSequence);

    if (noteToPlay !== null) {
        startNote(noteToPlay);
        setTimeout(() => stopNote(noteToPlay), noteDurationMs * 0.9);
    }
    
    state.arpIndex++;
}

function startArpeggiator() {
    stopArpeggiator();
    const { mode, rateFactor } = getArpParams();
    
    if (mode === 'off' || state.heldNotes.length === 0 || state.isPlaying) {
        return;
    }

    const bpm = parseInt(document.getElementById('bpm-input').value) || 120;
    const intervalTimeMs = (60 / bpm / 4) * 1000 / rateFactor;
    
    state.arpIndex = 0;
    state.arpeggiatorInterval = setInterval(runArpStep, intervalTimeMs);
    runArpStep();
}

function stopArpeggiator() {
    clearInterval(state.arpeggiatorInterval);
    state.arpeggiatorInterval = null;
    state.arpIndex = 0;
    Object.keys(state.activeVoices).forEach(note => {
        while (state.activeVoices[note] && state.activeVoices[note].length > 0) {
            stopNote(parseInt(note));
        }
    });
}


// --- Keyboard UI Functions ---
function updateBaseOctave(value) {
    state.baseOctave = parseInt(value);
    createPianoKeys();
}

function createPianoKeys() {
    const pianoKeys = document.getElementById('piano-keys');
    pianoKeys.innerHTML = '';
    
    const keys = [
        { note: 'C', midi: state.baseOctave, class: 'white', key: 'A' },
        { note: 'C#', midi: state.baseOctave + 1, class: 'black', key: 'W' },
        { note: 'D', midi: state.baseOctave + 2, class: 'white', key: 'S' },
        { note: 'D#', midi: state.baseOctave + 3, class: 'black', key: 'E' },
        { note: 'E', midi: state.baseOctave + 4, class: 'white', key: 'D' },
        { note: 'F', midi: state.baseOctave + 5, class: 'white', key: 'F' },
        { note: 'F#', midi: state.baseOctave + 6, class: 'black', key: 'T' },
        { note: 'G', midi: state.baseOctave + 7, class: 'white', key: 'G' },
        { note: 'G#', midi: state.baseOctave + 8, class: 'black', key: 'Y' },
        { note: 'A', midi: state.baseOctave + 9, class: 'white', key: 'H' },
        { note: 'A#', midi: state.baseOctave + 10, class: 'black', key: 'U' },
        { note: 'B', midi: state.baseOctave + 11, class: 'white', key: 'J' },
        { note: 'C+', midi: state.baseOctave + 12, class: 'white', key: 'K' }
    ];

    keys.forEach(keyData => {
        const keyEl = document.createElement('div');
        keyEl.className = `key ${keyData.class}`;
        keyEl.id = `key-${keyData.midi}`;
        keyEl.dataset.midi = keyData.midi;
        keyEl.innerHTML = `<div>${keyData.note}</div><div style="font-weight:bold; margin-bottom:5px;">${keyData.key}</div>`;
        
        keyEl.onmousedown = () => {
            noteOn(keyData.midi);
            keyEl.classList.add('active');
        };
        keyEl.onmouseup = () => {
            noteOff(keyData.midi);
            keyEl.classList.remove('active');
        };
        keyEl.onmouseleave = (e) => {
            if (e.buttons === 1) {
                noteOff(keyData.midi);
                keyEl.classList.remove('active');
            }
        };
        keyEl.ontouchstart = (e) => {
            e.preventDefault();
            noteOn(keyData.midi);
            keyEl.classList.add('active');
        };
        keyEl.ontouchend = (e) => {
            e.preventDefault();
            noteOff(keyData.midi);
            keyEl.classList.remove('active');
        };
        
        pianoKeys.appendChild(keyEl);
    });
}
const keyToMidi = {};
function setupKeyMappings() {
    const base = () => state.baseOctave;
    const mappings = {
        'A': () => base(), 'W': () => base() + 1, 'S': () => base() + 2, 'E': () => base() + 3,
        'D': () => base() + 4, 'F': () => base() + 5, 'T': () => base() + 6, 'G': () => base() + 7,
        'Y': () => base() + 8, 'H': () => base() + 9, 'U': () => base() + 10, 'J': () => base() + 11,
        'K': () => base() + 12
    };
    
    for (const key in keyToMidi) {
        delete keyToMidi[key];
    }
    for (const key in mappings) {
        keyToMidi[key] = mappings[key];
    }
}
document.addEventListener('keydown', (e) => {
    if (e.repeat) return;
    const key = e.key.toUpperCase();
    if (keyToMidi[key]) {
        const midiNote = keyToMidi[key]();
        noteOn(midiNote);
        document.getElementById(`key-${midiNote}`)?.classList.add('active');
    }
});
document.addEventListener('keyup', (e) => {
    const key = e.key.toUpperCase();
    if (keyToMidi[key]) {
        const midiNote = keyToMidi[key]();
        noteOff(midiNote);
        document.getElementById(`key-${midiNote}`)?.classList.remove('active');
    }
});

// --- Recording Functions ---
function bufferToWav(monoData, sampleRate) {
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

async function startRecording() {
    const recordBtn = document.getElementById('record-btn');
    recordBtn.disabled = true;
    document.getElementById('loading-overlay').style.display = 'flex';
    
    let totalTimeSec = 0;
    let patternsToRecord = [];
    const fileNamePrefix = state.isSongPlaying ? 'Song' : 'Pattern';

    try {
        if (state.isSongPlaying) {
            alert("Recording a song will stop playback. The recording will begin immediately.");
            stopSong();
            patternsToRecord = state.songPatterns;
        } else {
            const currentPattern = {
                name: "Current Pattern",
                state: getAllSynthState(),
                sequence: state.sequence.map(row => [...row])
            };
            patternsToRecord.push(currentPattern);
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

        if (totalTimeSec === 0) {
            recordBtn.disabled = false;
            document.getElementById('loading-overlay').style.display = 'none';
            alert("No notes or patterns to record.");
            return;
        }

        const sampleRate = audioCtx.sampleRate;
        const offlineCtx = new OfflineAudioContext(1, totalTimeSec * sampleRate, sampleRate);

        const masterGainNodeOffline = offlineCtx.createGain();
        masterGainNodeOffline.gain.setValueAtTime(parseFloat(patternsToRecord[0].state.master_volume), offlineCtx.currentTime);

        const vcfNodeOffline = offlineCtx.createBiquadFilter();
        vcfNodeOffline.type = 'lowpass';
        vcfNodeOffline.frequency.setValueAtTime(parseFloat(patternsToRecord[0].state.cutoff), offlineCtx.currentTime);
        vcfNodeOffline.Q.setValueAtTime(parseFloat(patternsToRecord[0].state.resonance), offlineCtx.currentTime);

        const synthOutputMixerOffline = offlineCtx.createGain();
        synthOutputMixerOffline.connect(vcfNodeOffline);
        
        vcfNodeOffline.connect(masterGainNodeOffline);
        masterGainNodeOffline.connect(offlineCtx.destination);
        
        let currentTime = 0;

        const createOfflineVoice = (context, patchState, midiNote, startTime, duration, destination) => {
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
        };

        const NUM_ROWS = 8;
        for (const pattern of patternsToRecord) {
            const patchState = pattern.state;
            const sequenceToRender = pattern.sequence;
            const timePerStepSec = pattern.timePerStepSec;
            const duration = pattern.duration;
            
            const scaleKey = patchState.scale_key || 'major';
            const scaleOffsets = SCALES[scaleKey].offsets;
            const offlineScaleNotes = scaleOffsets.slice(0, NUM_ROWS)
                .map(offset => (parseInt(patchState.baseOctave) || state.baseOctave) + offset)
                .reverse();
            
            masterGainNodeOffline.gain.linearRampToValueAtTime(parseFloat(patchState.master_volume), currentTime + 0.01);
            
            const cutoff = parseFloat(patchState.cutoff);
            const resonance = parseFloat(patchState.resonance);
            vcfNodeOffline.frequency.linearRampToValueAtTime(cutoff, currentTime + 0.01);
            vcfNodeOffline.Q.linearRampToValueAtTime(resonance, currentTime + 0.01);
            
            for (let step = 0; step < NUM_STEPS; step++) {
                const stepTime = currentTime + (step * timePerStepSec);
                
                for (let row = 0; row < NUM_ROWS; row++) {
                    if (sequenceToRender[row][step]) {
                        const midiNote = offlineScaleNotes[row];
                        const noteDuration = timePerStepSec * 0.9;
                        
                        createOfflineVoice(offlineCtx, patchState, midiNote, stepTime, noteDuration, synthOutputMixerOffline);
                    }
                }
            }
            
            currentTime += duration;
        }

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
// --- Sequencer Functions ---
function createGrid() {
    const sequencerGrid = document.getElementById('sequencer-grid');
    sequencerGrid.innerHTML = ''; 

    const NUM_ROWS = 8;
    const NUM_STEPS = 16;
    for (let row = 0; row < NUM_ROWS; row++) {
        const name = state.currentScaleNoteNames[row];
        const label = document.createElement('div');
        label.className = 'note-label';
        label.textContent = name;
        sequencerGrid.appendChild(label);
        
        for (let step = 0; step < NUM_STEPS; step++) {
            const stepEl = document.createElement('div');
            stepEl.className = 'step';
            stepEl.dataset.row = row;
            stepEl.dataset.step = step;
            if (state.sequence[row][step]) {
                stepEl.classList.add('on');
            }
            stepEl.onclick = () => {
                state.sequence[row][step] = 1 - state.sequence[row][step];
                stepEl.classList.toggle('on');
            };
            sequencerGrid.appendChild(stepEl);
        }
    }
}

function clearGrid() {
    const NUM_ROWS = 8;
    const NUM_STEPS = 16;
    state.sequence = Array(NUM_ROWS).fill().map(() => Array(NUM_STEPS).fill(0));
    createGrid();
}

function loadScale() {
    const scaleKey = document.getElementById('scale-selector').value;
    const scale = SCALES[scaleKey];
    if (!scale) return;

    const NUM_ROWS = 8;
    const offsets = scale.offsets.slice(0, NUM_ROWS);
    
    state.currentScaleMidiNotes = offsets.map(offset => state.baseOctave + offset).reverse();
    
    state.currentScaleNoteNames = state.currentScaleMidiNotes.map(midi => {
        const noteIndex = midi % 12;
        const octave = Math.floor(midi / 12) - 1;
        return `${MIDI_NOTE_NAMES[noteIndex]}${octave}`;
    });

    document.getElementById('sequencer-title').textContent = `16-Step Sequencer (${scale.name} Scale - C Root)`;
    createGrid();
    setupKeyMappings();
}

function runStep() {
    const NUM_STEPS = 16;
    const NUM_ROWS = 8;
    
    if (state.isSongPlaying && state.currentStep === 0 && state.nextPatternToLoad) {
        loadSynthControls(state.nextPatternToLoad.state);
        state.sequence = state.nextPatternToLoad.sequence.map(row => [...row]);
        createGrid();
        
        const newBpm = parseInt(state.nextPatternToLoad.state.bpm) || 120;
        document.getElementById('bpm-input').value = newBpm;
        
        clearInterval(state.sequencerInterval);
        startSequencer(true);
        
        state.nextPatternToLoad = null;
        return;
    }
    
    const prevStep = (state.currentStep - 1 + NUM_STEPS) % NUM_STEPS;
    for (let row = 0; row < NUM_ROWS; row++) {
        if (state.sequence[row][prevStep]) {
            const midiNote = state.currentScaleMidiNotes[row];
            stopNote(midiNote);
        }
    }

    document.querySelectorAll('.step.current').forEach(el => el.classList.remove('current'));
    const currentStepEls = document.querySelectorAll(`.step[data-step="${state.currentStep}"]`);
    currentStepEls.forEach(el => el.classList.add('current'));

    const bpm = parseInt(document.getElementById('bpm-input').value) || 120;
    const stepDurationMs = (60 / bpm / 4) * 1000;
    
    const { mode: arpMode } = getArpParams();
    let notesToArp = [];
    for (let row = 0; row < NUM_ROWS; row++) {
        if (state.sequence[row][state.currentStep]) {
            const midiNote = state.currentScaleMidiNotes[row];
            notesToArp.push(midiNote);
        }
    }
    notesToArp.sort((a, b) => a - b);

    if (arpMode === 'off' || notesToArp.length === 0) {
        notesToArp.forEach(midiNote => {
            startNote(midiNote);
            setTimeout(() => stopNote(midiNote), stepDurationMs * 0.9);
        });
    } else {
        const { rateFactor, octaves, chordSequence } = getArpParams();
        const numArpNotesPerStep = rateFactor;
        const arpNoteDurationMs = stepDurationMs / numArpNotesPerStep;

        for (let i = 0; i < numArpNotesPerStep; i++) {
            setTimeout(() => {
                Object.keys(state.activeVoices).forEach(note => {
                    while (state.activeVoices[note] && state.activeVoices[note].length > 0) {
                        stopNote(parseInt(note));
                    }
                });
                
                const totalArpIndex = (state.currentStep * numArpNotesPerStep) + i; 
                const noteToPlay = calculateArpNote(notesToArp, totalArpIndex, mode, octaves, chordSequence);
                
                if (noteToPlay !== null) {
                    startNote(noteToPlay);
                    setTimeout(() => stopNote(noteToPlay), arpNoteDurationMs * 0.9);
                }
            }, i * arpNoteDurationMs);
        }
    }

    state.currentStep = (state.currentStep + 1) % NUM_STEPS;
    
    if (state.isSongPlaying && state.currentStep === 0) {
        advanceSongPattern();
    }
}

function startSequencer(isSongContinue = false) {
    if (state.isPlaying && !isSongContinue) return;
    
    stopArpeggiator();
    
    state.isPlaying = true;
    if (!isSongContinue) {
        state.currentStep = 0;
    }
    
    const bpm = parseInt(document.getElementById('bpm-input').value) || 120;
    const intervalTimeMs = (60 / bpm / 4) * 1000;
    
    clearInterval(state.sequencerInterval);
    state.sequencerInterval = setInterval(runStep, intervalTimeMs);
    
    document.getElementById('play-btn').textContent = 'PAUSE';
    
    if (!isSongContinue) {
        runStep();
    }
}

function startStopSequencer() {
    if (state.isSongPlaying) {
        alert("Please stop SONG mode to use the sequencer manually.");
        return;
    }

    if (state.isPlaying) {
        state.isPlaying = false;
        clearInterval(state.sequencerInterval);
        document.getElementById('play-btn').textContent = 'PLAY';
        
        Object.keys(state.activeVoices).forEach(note => {
            while(state.activeVoices[note] && state.activeVoices[note].length > 0) {
                stopNote(parseInt(note));
            }
        });
        document.querySelectorAll('.step.current').forEach(el => el.classList.remove('current'));
        
        if (state.heldNotes.length > 0 && document.getElementById('arp-mode').value !== 'off') {
            startArpeggiator();
        }

    } else {
        startSequencer();
    }
}

function stopSequencer() {
    state.isPlaying = false;
    clearInterval(state.sequencerInterval);
    document.getElementById('play-btn').textContent = 'PLAY';
    document.querySelectorAll('.step.current').forEach(el => el.classList.remove('current'));
    
    Object.keys(state.activeVoices).forEach(note => {
        while(state.activeVoices[note] && state.activeVoices[note].length > 0) {
            stopNote(parseInt(note));
        }
    });
    
    state.currentStep = 0;
    
    if (state.isSongPlaying) {
        stopSong();
    }
    
    if (state.heldNotes.length > 0 && document.getElementById('arp-mode').value !== 'off') {
        startArpeggiator();
    }
}


// --- Song/Pattern Functions ---
function savePattern() {
    const pattern = {
        name: `Pattern ${String.fromCharCode(65 + state.songPatterns.length)}`,
        state: getAllSynthState(),
        sequence: state.sequence.map(row => [...row])
    };
    state.songPatterns.push(pattern);
    
    document.getElementById('save-pattern-btn').textContent = `SAVE PATTERN ${String.fromCharCode(65 + state.songPatterns.length)}`;
    updatePatternDisplay();
}

function updatePatternDisplay() {
    const displayEl = document.getElementById('pattern-display');
    displayEl.innerHTML = '';
    
    if (state.songPatterns.length === 0) {
        displayEl.innerHTML = '<p style="margin: 0; color: #aaa;">Saved Patterns: None</p>';
        return;
    }
    
    state.songPatterns.forEach((pattern, index) => {
        const tile = document.createElement('div');
        tile.className = 'pattern-tile';
        const scaleName = SCALES[pattern.state.scale_key]?.name || 'Unknown';
        tile.textContent = `${pattern.name} (${scaleName})`;
        tile.dataset.index = index;

        if (state.isSongPlaying && index === state.currentPatternIndex) {
            tile.classList.add('playing');
        }

        tile.onclick = () => {
            if (state.isPlaying) {
                stopSequencer();
            }
            loadPattern(index);
        };

        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'X';
        deleteBtn.onclick = (e) => {
            e.stopPropagation();
            deletePattern(index);
        };
        tile.appendChild(deleteBtn);

        displayEl.appendChild(tile);
    });
}

function deletePattern(index) {
    if (state.isSongPlaying) {
        alert("Cannot delete patterns while Song Play is active. Please stop the song first.");
        return;
    }
    
    if (confirm(`Are you sure you want to delete ${state.songPatterns[index].name}?`)) {
        state.songPatterns.splice(index, 1);
        
        state.songPatterns.forEach((p, i) => {
            if (i >= index) {
                p.name = `Pattern ${String.fromCharCode(65 + i)}`;
            }
        });

        if (index === state.currentPatternIndex && state.songPatterns.length > 0) {
            state.currentPatternIndex = 0;
            loadPattern(0);
        } else if (state.songPatterns.length === 0) {
            state.currentPatternIndex = 0;
        } else if (index < state.currentPatternIndex) {
            state.currentPatternIndex--;
        }
        
        updatePatternDisplay();
        document.getElementById('save-pattern-btn').textContent = `SAVE PATTERN ${String.fromCharCode(65 + state.songPatterns.length)}`;
    }
}

function loadPattern(index) {
    const pattern = state.songPatterns[index];
    if (!pattern) return;
    
    loadSynthControls(pattern.state);
    
    state.sequence = pattern.sequence.map(row => [...row]);
    createGrid();
}

// --- SONG PLAYBACK LOGIC ---
function advanceSongPattern() {
    if (state.currentPatternIndex >= state.songPatterns.length - 1) {
        stopSong();
        return;
    }
    
    state.currentPatternIndex++;
    state.nextPatternToLoad = state.songPatterns[state.currentPatternIndex]; 
    updatePatternDisplay();
}

function startStopSong() {
    const songBtn = document.getElementById('play-song-btn');
    
    if (state.isSongPlaying) {
        stopSong();
        songBtn.textContent = 'PLAY SONG';
        songBtn.classList.remove('active');
    } else {
        if (state.songPatterns.length === 0) {
            alert("No patterns saved to play.");
            return;
        }
        
        if (state.isPlaying) {
            stopSequencer();
        }
        
        state.isSongPlaying = true;
        state.currentPatternIndex = 0;
        songBtn.textContent = 'STOP SONG';
        songBtn.classList.add('active');
        
        loadPattern(state.currentPatternIndex);
        updatePatternDisplay();
        
        startSequencer();
    }
}

function stopSong() {
    state.isSongPlaying = false;
    state.nextPatternToLoad = null;
    state.currentPatternIndex = 0;
    
    const songBtn = document.getElementById('play-song-btn');
    songBtn.textContent = 'PLAY SONG';
    songBtn.classList.remove('active');
    
    if (state.isPlaying) {
        stopSequencer();
    }
    updatePatternDisplay();
}


// --- Patch Logic ---
function loadPatch() {
    const patchKey = document.getElementById('patch-selector').value;
    const patch = PATCHES[patchKey];

    if (!patch) return;

    loadSynthControls(patch);
    clearGrid();
}


// --- Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    initializeGlobalAudioChain(); 
    createPianoKeys(); 
    populatePatchSelector(); 
    populateScaleSelector(); 
    loadScale(); 
    initRealTimeLfo();
    updateAllRangeLabels(); 
    updatePatternDisplay(); 
});


// Dynamically populates the patch selector
function populatePatchSelector() {
    const selector = document.getElementById('patch-selector');
    selector.innerHTML = '';
    for (const key in PATCHES) {
        const option = document.createElement('option');
        option.value = key;
        let name = key.replace(/_/g, ' ');
        name = name.charAt(0).toUpperCase() + name.slice(1);
        option.textContent = name;
        selector.appendChild(option);
        
        if (key === 'default') {
            option.selected = true;
        }
    }
}

// Dynamically populates the scale selector
function populateScaleSelector() {
    const selector = document.getElementById('scale-selector');
    selector.innerHTML = '';
    for (const key in SCALES) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = SCALES[key].name;
        selector.appendChild(option);
    }
}

// --- GLOBAL EVENT LISTENERS ---
document.addEventListener('DOMContentLoaded', () => {
    // Synth Controls
    document.getElementById('vco1-wave').onchange = (e) => state.vco1Wave = e.target.value;
    document.getElementById('vco2-wave').onchange = (e) => state.vco2Wave = e.target.value;
    
    document.querySelectorAll('input[type="range"]').forEach(input => {
        if(input.id.includes('vco') || input.id.includes('adsr') || input.id.includes('noise')) {
            input.oninput = () => updateRangeLabel(input);
        }
    });

    document.getElementById('vco1-fine-tune').oninput = (e) => updateRangeLabel(e.target);
    document.getElementById('vco1-level').oninput = (e) => updateRangeLabel(e.target);
    document.getElementById('vco2-fine-tune').oninput = (e) => updateRangeLabel(e.target);
    document.getElementById('vco2-level').oninput = (e) => updateRangeLabel(e.target);

    document.getElementById('attack').oninput = (e) => updateRangeLabel(e.target, 's');
    document.getElementById('decay').oninput = (e) => updateRangeLabel(e.target, 's');
    document.getElementById('sustain').oninput = (e) => updateRangeLabel(e.target);
    document.getElementById('release').oninput = (e) => updateRangeLabel(e.target, 's');

    document.getElementById('cutoff').oninput = (e) => { updateVCF(); updateRangeLabel(e.target, ' Hz'); };
    document.getElementById('resonance').oninput = (e) => { updateVCF(); updateRangeLabel(e.target); };
    document.getElementById('lfo-vcf-depth').oninput = (e) => { updateRangeLabel(e.target, ' Hz'); initRealTimeLfo(); };

    document.getElementById('lfo-rate').oninput = (e) => updateLFO(e.target.value, 'rate', document.getElementById('lfo-rate-val'));
    document.getElementById('lfo-wave').onchange = (e) => updateLFO(e.target.value, 'wave');
    document.getElementById('lfo-vco1-depth').oninput = (e) => updateRangeLabel(e.target, ' semitones');
    document.getElementById('lfo-vco2-depth').oninput = (e) => updateRangeLabel(e.target, ' semitones');
    
    document.getElementById('noise-level').oninput = (e) => updateRangeLabel(e.target);

    document.getElementById('delay-time').oninput = (e) => { updateDelay(); updateRangeLabel(e.target, 's'); };
    document.getElementById('delay-feedback').oninput = (e) => { updateDelay(); updateRangeLabel(e.target); };
    document.getElementById('delay-mix').oninput = (e) => { updateDelay(); updateRangeLabel(e.target); };

    document.getElementById('master-volume').oninput = (e) => { audioNodes.masterGainNode.gain.setValueAtTime(e.target.value, audioCtx.currentTime); updateRangeLabel(e.target); };

    // Patch
    document.getElementById('load-patch-btn').onclick = loadPatch;

    // Arp
    document.getElementById('arp-mode').onchange = startArpeggiator;
    document.getElementById('arp-rate').onchange = startArpeggiator;
    document.getElementById('arp-chords').onchange = startArpeggiator;
    document.getElementById('arp-octaves').onchange = startArpeggiator;

    // Keyboard
    document.getElementById('octave-selector').onchange = (e) => updateBaseOctave(e.target.value);

    // Scale
    document.getElementById('scale-selector').onchange = loadScale;

    // Transport
    document.getElementById('play-btn').onclick = startStopSequencer;
    document.getElementById('stop-btn').onclick = stopSequencer;
    document.getElementById('record-btn').onclick = startRecording;
    document.getElementById('clear-btn').onclick = clearGrid;
    
    // Song
    document.getElementById('save-pattern-btn').onclick = savePattern;
    document.getElementById('play-song-btn').onclick = startStopSong;
});