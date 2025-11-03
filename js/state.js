/*
 * js/state.js
 * This file holds the "live" state of the synthesizer.
 * All modules will import these objects so they can
 * share and modify the same data.
 */

// AudioContext is special, we create it right away
export const audioCtx = new (window.AudioContext || window.webkitAudioContext)();

// --- Global Audio Nodes ---
// We use an object to hold all nodes
export const audioNodes = {
    masterGainNode: null,
    synthOutputMixer: null,
    vcfNode: null,
    delayNode: null,
    feedbackGain: null,
    wetGain: null,
    dryGain: null,
    realTimeLfoNode: null,
    lfoVcfDepthParam: null
};

// --- Global Synth State ---
// We use an object to hold all state variables
export const state = {
    currentStep: 0,
    isPlaying: false,
    sequencerInterval: null,

    baseOctave: 60,
    vco1Wave: 'sawtooth',
    vco2Wave: 'sawtooth',
    
    // LFO params (values, not nodes)
    lfoRate: 5.0,
    lfoWave: 'sine',

    // Arpeggiator
    heldNotes: [],
    arpeggiatorInterval: null,
    arpIndex: 0,

    // Song
    songPatterns: [],
    isSongPlaying: false,
    currentPatternIndex: 0,
    nextPatternToLoad: null,

    // Sequencer
    // We get NUM_ROWS and NUM_STEPS from constants.js later,
    // but for now, we'll hardcode 8x16
    sequence: Array(8).fill().map(() => Array(16).fill(0)), 
    currentScaleNoteNames: [],
    currentScaleMidiNotes: [],

    // Note Tracking
    activeVoices: {} // Tracks { midiNote: [osc1, osc2, gainNode, ...], ... }
};