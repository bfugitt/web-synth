/*
 * js/patch.js
 * Handles loading/saving of synth patches and states.
 */

import { state, audioCtx, audioNodes } from './state.js';
import { PATCHES } from './constants.js';
import { updateAllRangeLabels } from './ui.js';

// --- THIS IS THE BUG FIX ---
// It was trying to import 'updateDelay', but we renamed it
// to 'updateDelayParams' in the last step.
import { 
    updateVCF, 
    updateDelayParams, // <-- This is the fix
    updateLFO, 
    initRealTimeLfo 
} from './audioEngine.js';
// --- END BUG FIX ---


// We'll have a circular dependency if we import sequencer.js (for loadScale)
// So, main.js will pass the loadScale function to us.

let _loadScale; // Private function to be set by main.js
export function initPatcher(loadScaleFn) {
    _loadScale = loadScaleFn;
}

export function getAllSynthState() {
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
        delay_time: document.getElementById('delay-time').value,
        delay_feedback: document.getElementById('delay-feedback').value,
        delay_mix: document.getElementById('delay-mix').value,
        master_volume: document.getElementById('master-volume').value,
        arp_mode: document.getElementById('arp-mode').value,
        arp_rate: document.getElementById('arp-rate').value,
        arp_chords: document.getElementById('arp-chords').value,
        arp_octaves: document.getElementById('arp-octaves').value,
        bpm: document.getElementById('bpm-input').value,
        scale_key: document.getElementById('scale-selector').value,
        baseOctave: document.getElementById('octave-selector').value
    };
}

export function loadSynthControls(patchState) {
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
        { id: 'scale-selector', key: 'scale_key' },
        { id: 'octave-selector', key: 'baseOctave' }
    ];

    controls.forEach(control => {
        if (patchState[control.key] !== undefined) {
            const el = document.getElementById(control.id);
            if (el) {
                el.value = patchState[control.key];
            }
        }
    });

    state.vco1Wave = patchState.vco1_wave;
    state.vco2Wave = patchState.vco2_wave;
    state.baseOctave = parseInt(patchState.baseOctave) || 60;
    
    updateAllRangeLabels();
    updateVCF();
    updateDelayParams(); // This now correctly calls the renamed function
    updateLFO(patchState.lfo_rate, 'rate');
    updateLFO(patchState.lfo_wave, 'wave');
    initRealTimeLfo();
    audioNodes.masterGainNode.gain.setValueAtTime(parseFloat(patchState.master_volume), audioCtx.currentTime);

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
