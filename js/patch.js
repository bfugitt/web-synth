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

// We need functions from effects.js to update the pedal state
import { toggleDistortion, toggleDelay, toggleReverb, updateDelayMix, updateReverbMix } from './effects.js';


let _loadScale; // Private function to be set by main.js
export function initPatcher(loadScaleFn) {
    _loadScale = loadScaleFn;
}

// Helper to check if a pedal button is 'on'
function isPedalOn(id) {
    const btn = document.getElementById(id);
    return btn && btn.classList.contains('active');
}

export function getAllSynthState() {
    return {
        // ... (all existing synth properties) ...
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

        // --- NEW: Save Pedal States ---
        distortion_amount: document.getElementById('distortion-amount').value,
        distortion_on: isPedalOn('distortion-bypass-btn'),
        
        delay_time: document.getElementById('delay-time').value,
        delay_feedback: document.getElementById('delay-feedback').value,
        delay_mix: document.getElementById('delay-mix').value,
        delay_on: isPedalOn('delay-bypass-btn'),
        
        reverb_mix: document.getElementById('reverb-mix').value,
        reverb_on: isPedalOn('reverb-bypass-btn')
    };
}

// Helper to set a pedal button's state
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
    const controls = [
        // ... (all existing controls) ...
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
        { id: 'master-volume', key: 'master_volume' },
        { id: 'arp-mode', key: 'arp_mode' },
        { id: 'arp-rate', key: 'arp_rate' },
        { id: 'arp-chords', key: 'arp_chords' },
        { id: 'arp-octaves', key: 'arp_octaves' },
        { id: 'bpm-input', key: 'bpm' },
        { id: 'scale-selector', key: 'scale_key' },
        { id: 'octave-selector', key: 'baseOctave' },
        
        // --- NEW: Load Pedal Controls ---
        { id: 'distortion-amount', key: 'distortion_amount' },
        { id: 'delay-time', key: 'delay_time' },
        { id: 'delay-feedback', key: 'delay_feedback' },
        { id: 'delay-mix', key: 'delay_mix' },
        { id: 'reverb-mix', key: 'reverb_mix' }
    ];

    controls.forEach(control => {
        if (patchState[control.key] !== undefined) {
            const el = document.getElementById(control.id);
            if (el) {
                el.value = patchState[control.key];
            }
        }
    });

    // Update synth state
    state.vco1Wave = patchState.vco1_wave;
    state.vco2Wave = patchState.vco2_wave;
    state.baseOctave = parseInt(patchState.baseOctave) || 60;
    
    // Update labels and audio engine
    updateAllRangeLabels();
    updateVCF();
    updateDelayParams();
    updateLFO(patchState.lfo_rate, 'rate');
    updateLFO(patchState.lfo_wave, 'wave');
    initRealTimeLfo();
    audioNodes.masterGainNode.gain.setValueAtTime(parseFloat(patchState.master_volume), audioCtx.currentTime);

    // --- NEW: Set Pedal On/Off States ---
    setPedalState('distortion-bypass-btn', patchState.distortion_on);
    toggleDistortion(patchState.distortion_on);
    
    setPedalState('delay-bypass-btn', patchState.delay_on);
    toggleDelay(patchState.delay_on);
    
    setPedalState('reverb-bypass-btn', patchState.reverb_on);
    toggleReverb(patchState.reverb_on);

    // Update pedal-dependent params
    updateDelayMix(patchState.delay_mix);
    updateReverbMix(patchState.reverb_mix);

    // Load scale
    if (patchState.scale_key && _loadScale) {
        document.getElementById('scale-selector').value = patchState.scale_key;
        _loadScale();
    }
}

export function loadPatch() {
    const patchKey = document.getElementById('patch-selector').value;
    const patch = PATCHES[patchKey];
    if (!patch) return;
    loadSynthControls(patch);
    // We need clearGrid... main.js will call it.
}
