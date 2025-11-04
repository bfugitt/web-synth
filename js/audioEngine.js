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

// Helper function to create the distortion "curve"
export function makeDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 50,
        n_samples = 44100,
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180,
        i = 0,
        x;
    for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
};


// --- Audio Chain Initialization ---
export function initializeGlobalAudioChain() {
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
    audioNodes.distortion.wet.gain.value = 0; // Off
    audioNodes.distortion.dry.gain.value = 1; // Bypassed

    // 4. Delay Pedal Nodes
    audioNodes.delay = {
        input: audioCtx.createGain(),
        delayNode: audioCtx.createDelay(2.0),
        feedbackGain: audioCtx.createGain(),
        wetGain: audioCtx.createGain(),
        dryGain: audioCtx.createGain(),
        output: audioCtx.createGain()
    };
    // Set delay to OFF by default
    audioNodes.delay.wetGain.gain.value = 0;
    audioNodes.delay.dryGain.gain.value = 1;

    // 5. Reverb Pedal Nodes (NEW)
    audioNodes.reverb = {
        input: audioCtx.createGain(),
        convolver: audioCtx.createConvolver(), // The magic!
        wet: audioCtx.createGain(),
        dry: audioCtx.createGain(),
        output: audioCtx.createGain()
    };
    // Set reverb to OFF by default
    audioNodes.reverb.wet.gain.value = 0;
    audioNodes.reverb.dry.gain.value = 1;

    
    // --- CONNECT THE FULL CHAIN ---
    
    // 1. Synth Voices -> Mixer -> VCF
    audioNodes.synthOutputMixer.connect(audioNodes.vcfNode);
    
    // 2. VCF -> Distortion Pedal
    audioNodes.vcfNode.connect(audioNodes.distortion.input);
    audioNodes.distortion.input.connect(audioNodes.distortion.dry).connect(audioNodes.distortion.output);
    audioNodes.distortion.input.connect(audioNodes.distortion.waveShaper).connect(audioNodes.distortion.wet).connect(audioNodes.distortion.output);

    // 3. Distortion Pedal -> Delay Pedal
    audioNodes.distortion.output.connect(audioNodes.delay.input);
    
    // 4. Inside Delay Pedal
    audioNodes.delay.input.connect(audioNodes.delay.delayNode).connect(audioNodes.delay.feedbackGain).connect(audioNodes.delay.delayNode); // Wet path loop
    audioNodes.delay.delayNode.connect(audioNodes.delay.wetGain).connect(audioNodes.delay.output); // Wet path out
    audioNodes.delay.input.connect(audioNodes.delay.dryGain).connect(audioNodes.delay.output); // Dry path out
    
    // 5. Delay Pedal -> Reverb Pedal (NEW)
    audioNodes.delay.output.connect(audioNodes.reverb.input);
    audioNodes.reverb.input.connect(audioNodes.reverb.dry).connect(audioNodes.reverb.output); // Dry path
    audioNodes.reverb.input.connect(audioNodes.reverb.convolver).connect(audioNodes.reverb.wet).connect(audioNodes.reverb.output); // Wet path

    // 6. Reverb Pedal (Output) -> Master Volume -> Speakers
    audioNodes.reverb.output.connect(audioNodes.masterGainNode);
    audioNodes.masterGainNode.connect(audioCtx.destination);

    // Initialize parameters
    updateDelayParams(); // Renamed this
    updateVCF();
}

export function updateVCF() {
    const time = audioCtx.currentTime;
    audioNodes.vcfNode.frequency.linearRampToValueAtTime(parseFloat(document.getElementById('cutoff').value), time + 0.01);
    audioNodes.vcfNode.Q.linearRampToValueAtTime(parseFloat(document.getElementById('resonance').value), time + 0.01);
}

// This function only updates the *parameters*
// The on/off logic is now in effects.js
export function updateDelayParams() {
    const time = parseFloat(document.getElementById('delay-time').value);
    const feedback = parseFloat(document.getElementById('delay-feedback').value);
    const currentTime = audioCtx.currentTime;

    audioNodes.delay.delayNode.delayTime.linearRampToValueAtTime(time, currentTime + 0.01);
    audioNodes.delay.feedbackGain.gain.linearRampToValueAtTime(feedback, currentTime + 0.01);
    
    // The "mix" is now handled by the wet/dry gains
    // We'll add that to effects.js
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

// --- Core Note On/Off Functions (Unchanged) ---
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
