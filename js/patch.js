/*
 * js/patch.js
 * Handles loading/saving of synth patches and states.
 */

import { state, audioCtx, audioNodes } from './state.js';
import { PATCHES } from './constants.js';
import { updateAllRangeLabels } from './ui.js';
import { 
    updateVCF, 
    updateDelayParams,
    updateLFO, 
    initRealTimeLfo 
} from './audioEngine.js';

// Import ALL effects functions
import { 
    toggleDistortion, updateDistortionAmount,
    toggleDelay, updateDelayMix,
    toggleReverb, updateReverbMix,
    toggleChorus, updateChorusRate, updateChorusDepth, updateChorusMix
} from './effects.js';


let _loadScale;
export function initPatcher(loadScaleFn) {
    _loadScale = loadScaleFn;
}

// --- Helper Functions (Unchanged) ---
function _getRandomValue(min, max, step = 0.01) {
    const range = max - min;
    const val = Math.random() * range + min;
    return parseFloat((Math.round(val / step) * step).toFixed(2));
}
function _getRandomInt(min, max) {
    min = Math.ceil(min);
    max = Math.floor(max);
    return Math.floor(Math.random() * (max - min + 1)) + min;
}
function _getRandomChoice(array) {
    return array[Math.floor(Math.random() * array.length)];
}
// --- END HELPERS ---


// --- Randomize Patch Function (Unchanged) ---
export function randomizePatch() {
    // 1. Core Synth Parameters
    const newPatch = {
        vco1_wave: _getRandomChoice(['sawtooth', 'square', 'sine', 'triangle']),
        vco1_range: _getRandomChoice(['-12', '0', '12', '24']),
        vco1_fine_tune: _getRandomValue(-0.2, 0.2).toString(),
        vco1_level: _getRandomValue(0.4, 0.9).toString(),
        
        vco2_wave: _getRandomChoice(['sawtooth', 'square', 'sine', 'triangle']),
        vco2_range: _getRandomChoice(['-12', '0', '12', '24']),
        vco2_fine_tune: _getRandomValue(-0.2, 0.2).toString(),
        vco2_level: _getRandomValue(0.4, 0.9).toString(),

        attack: _getRandomValue(0.01, 0.4).toString(),
        decay: _getRandomValue(0.1, 0.6).toString(),
        sustain: _getRandomValue(0.3, 0.8).toString(),
        release: _getRandomValue(0.2, 1.0, 0.05).toString(),

        cutoff: _getRandomInt(300, 6000).toString(),
        resonance: _getRandomValue(1.0, 5.0, 0.1).toString(),

        lfo_rate: _getRandomValue(2, 8, 0.05).toString(),
        lfo_wave: _getRandomChoice(['sine', 'triangle', 'sawtooth', 'square']),
        
        lfo_vcf_depth: (Math.random() < 0.4) ? _getRandomInt(100, 800).toString() : "0", 
        lfo_vco1_depth: (Math.random() < 0.3) ? _getRandomValue(0.1, 6, 0.1).toString() : "0.0",
        lfo_vco2_depth: (Math.random() < 0.3) ? _getRandomValue(0.1, 6, 0.1).toString() : "0.0",

        noise_level: _getRandomValue(0, 0.15).toString(),
        
        // 2. Effects (50% chance for each)
        distortion_on: Math.random() < 0.5,
        distortion_amount: _getRandomInt(50, 200).toString(),
        
        chorus_on: Math.random() < 0.5,
        chorus_rate: _getRandomValue(1.0, 4.0, 0.1).toString(),
        chorus_depth: _getRandomValue(0.3, 0.7).toString(),
        chorus_mix: _getRandomValue(0.3, 0.5).toString(),
        
        delay_on: Math.random() < 0.5,
        delay_time: _getRandomValue(0.1, 0.5, 0.01).toString(),
        delay_feedback: _getRandomValue(0.2, 0.5).toString(),
        delay_mix: _getRandomValue(0.3, 0.5).toString(),
        
        reverb_on: Math.random() < 0.5,
        reverb_mix: _getRandomValue(0.3, 0.5).toString(),
        
        // 3. Set non-randomized (safe) defaults
        master_volume: "0.7",
        baseOctave: "60",
        scale_key: document.getElementById('scale-selector').value,
        bpm: document.getElementById('bpm-input').value,
        arp_mode: "off",
        arp_rate: "1",
        arp_chords: "held_notes",
        arp_octaves: "2",
    };

    // 4. Load the new patch!
    loadSynthControls(newPatch);
}


function isPedalOn(id) {
    const btn = document.getElementById(id);
    return btn && btn.classList.contains('active');
}

export function getAllSynthState() {
    // This function is unchanged
    return {
        vco1_wave: document.getElementById('vco1-wave').value,
        vco1_range: document.getElementById('vco1-range').value,
        vco1_fine_tune: document.getElementById('vco1-fine-tune').value,
        vco1_level: document.getElementById('vco1-level').value,
        vco2_wave: document.getElementById('vco2-wave').value,
        vco2_range: document.getElementById('vco2-range').value,
        vco2_fine_tune: document.getElementById('vco2-fine-tune').value,
        vco2_level: document.getElementById('vco2-level').value,
        attack: document.getElementById('attack').value,
        decay: document.getElementById('decay').value,
        sustain: document.getElementById('sustain').value,
        release: document.getElementById('release').value,
        cutoff: document.getElementById('cutoff').value,
        resonance: document.getElementById('resonance').value,
        lfo_vcf_depth: document.getElementById('lfo-vcf-depth').value,
        lfo_rate: document.getElementById('lfo-rate').value,
        lfo_wave: document.getElementById('lfo-wave').value,
        lfo_vco1_depth: document.getElementById('lfo-vco1-depth').value,
        lfo_vco2_depth: document.getElementById('lfo-vco2-depth').value,
        noise_level: document.getElementById('noise-level').value,
        master_volume: document.getElementById('master-volume').value,
        arp_mode: document.getElementById('arp-mode').value,
        arp_rate: document.getElementById('arp-rate').value,
        arp_chords: document.getElementById('arp-chords').value,
        arp_octaves: document.getElementById('arp-octaves').value,
        bpm: document.getElementById('bpm-input').value,
        scale_key: document.getElementById('scale-selector').value,
        baseOctave: document.getElementById('octave-selector').value,
        distortion_amount: document.getElementById('distortion-amount').value,
        distortion_on: isPedalOn('distortion-bypass-btn'),
        chorus_rate: document.getElementById('chorus-rate').value,
        chorus_depth: document.getElementById('chorus-depth').value,
        chorus_mix: document.getElementById('chorus-mix').value,
        chorus_on: isPedalOn('chorus-bypass-btn'),
        delay_time: document.getElementById('delay-time').value,
        delay_feedback: document.getElementById('delay-feedback').value,
        delay_mix: document.getElementById('delay-mix').value,
        delay_on: isPedalOn('delay-bypass-btn'),
        reverb_mix: document.getElementById('reverb-mix').value,
        reverb_on: isPedalOn('reverb-bypass-btn')
    };
}

function setPedalState(id, isOn) {
    const btn = document.getElementById(id);
    if (!btn) return;
    
    if (isOn) {
        btn.classList.add('active');
        btn.textContent = 'ON';
    } else {
        btn.classList.remove('active');
        btn.textContent = 'OFF';
    }
}

export function loadSynthControls(patchState) {
    // This function is unchanged...
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
        { id: 'lfo_vcf_depth', key: 'lfo_vcf_depth' },
        { id: 'lfo-rate', key: 'lfo_rate' },
        { id: 'lfo-wave', key: 'lfo_wave' },
        { id: 'lfo_vco1_depth', key: 'lfo_vco1_depth' },
        { id: 'lfo_vco2_depth', key: 'lfo_vco2_depth' },
        { id: 'noise-level', key: 'noise_level' },
        { id: 'master-volume', key: 'master_volume' },
        { id: 'arp-mode', key: 'arp_mode' },
        { id: 'arp-rate', key: 'arp_rate' },
        { id: 'arp-chords', key: 'arp_chords' },
        { id: 'arp-octaves', key: 'arp_octaves' },
        { id: 'bpm-input', key: 'bpm' },
        { id: 'scale-selector', key: 'scale_key' },
        { id: 'octave-selector', key: 'baseOctave' },
        { id: 'distortion-amount', key: 'distortion_amount' },
        { id: 'chorus-rate', key: 'chorus_rate' },
        { id: 'chorus-depth', key: 'chorus_depth' },
        { id: 'chorus-mix', key: 'chorus_mix' },
        { id: 'delay-time', key: 'delay_time' },
        { id: 'delay-feedback', key: 'delay_feedback' },
        { id: 'delay-mix', key: 'delay_mix' },
        { id: 'reverb-mix', key: 'reverb_mix' }
    ];

    controls.forEach(control => {
        const value = patchState[control.key];
        if (value !== undefined) {
            const el = document.getElementById(control.id);
            if (el) {
                el.value = value;
            }
        }
    });

    state.vco1Wave = patchState.vco1_wave;
    state.vco2Wave = patchState.vco2_wave;
    state.baseOctave = parseInt(patchState.baseOctave) || 60;
    
    updateAllRangeLabels();
    updateVCF();
    updateDelayParams();
    updateLFO(patchState.lfo_rate, 'rate');
    updateLFO(patchState.lfo_wave, 'wave');
    initRealTimeLfo();
    audioNodes.masterGainNode.gain.setValueAtTime(parseFloat(patchState.master_volume), audioCtx.currentTime);

    setPedalState('distortion-bypass-btn', patchState.distortion_on);
    toggleDistortion(patchState.distortion_on);
    
    setPedalState('chorus-bypass-btn', patchState.chorus_on);
    toggleChorus(patchState.chorus_on);

    setPedalState('delay-bypass-btn', patchState.delay_on);
    toggleDelay(patchState.delay_on);
    
    setPedalState('reverb-bypass-btn', patchState.reverb_on);
    toggleReverb(patchState.reverb_on);

    // --- THIS IS THE FIX ---
    // The toggle...() functions already read the sliders and set the mix.
    // These extra calls were forcing the pedals' audio ON even when
    // the toggle functions had just turned them OFF.
    
    // Update pedal-dependent params (using fallbacks for safety)
    updateChorusRate(patchState.chorus_rate || "1.5");
    updateChorusDepth(patchState.chorus_depth || "0.5");
    // updateChorusMix(patchState.chorus_mix || "0.5", patchState.chorus_on); // <-- REMOVED
    // updateDelayMix(patchState.delay_mix || "0.5", patchState.delay_on); // <-- REMOVED
    // updateReverbMix(patchState.reverb_mix || "0.5", patchState.reverb_on); // <-- REMOVED
    // --- END FIX ---

    // Load scale
    if (patchState.scale_key && _loadScale) {
        document.getElementById('scale-selector').value = patchState.scale_key;
        _loadScale();
    }
}

export function loadPatch() {
    // This function is unchanged
    const patchKey = document.getElementById('patch-selector').value;
    const patch = PATCHES[patchKey];
    if (!patch) return;
    loadSynthControls(patch);
    // We need clearGrid... main.js will call it.
}
