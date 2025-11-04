/*
 * js/sequencer.js
 * Handles sequencer logic and transport controls.
 */

import { state, audioCtx } from './state.js';
import { SCALES, MIDI_NOTE_NAMES } from './constants.js';
import { startNote, stopNote } from './audioEngine.js';
import { getArpParams, calculateArpNote, stopArpeggiator, startArpeggiator } from './arpeggiator.js';

// We need functions from other modules,
// they will be passed in by main.js
let _loadSynthControls;
let _createGrid;
let _setupKeyMappings;

export function initSequencer(loadControlsFn, createGridFn, setupKeysFn) {
    _loadSynthControls = loadControlsFn;
    _createGrid = createGridFn;
    _setupKeyMappings = setupKeysFn;
}

export function clearGrid() {
    const NUM_ROWS = 8;
    const NUM_STEPS = 16;
    state.sequence = Array(NUM_ROWS).fill().map(() => Array(NUM_STEPS).fill(0));
    if (_createGrid) _createGrid();
}

export function loadScale() {
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
    if (_createGrid) _createGrid();
    if (_setupKeyMappings) _setupKeyMappings();
}

function runStep() {
    const NUM_STEPS = 16;
    const NUM_ROWS = 8;
    
    if (state.isSongPlaying && state.currentStep === 0 && state.nextPatternToLoad) {
        if (_loadSynthControls) _loadSynthControls(state.nextPatternToLoad.state);
        state.sequence = state.nextPatternToLoad.sequence.map(row => [...row]);
        if (_createGrid) _createGrid();
        
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
        // We need to call advanceSongPattern...
        // This is another circular dependency.
        // We'll have main.js pass this function in.
        if (_advanceSongPattern) _advanceSongPattern();
    }
}

// We need to get this function from song.js
let _advanceSongPattern;
export function setAdvanceSongFn(fn) {
    _advanceSongPattern = fn;
}

export function startSequencer(isSongContinue = false) {
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

// We need stopSong from song.js
let _stopSong;
export function setStopSongFn(fn) {
    _stopSong = fn;
}

export function startStopSequencer() {
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

export function stopSequencer() {
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
    
    if (state.isSongPlaying && _stopSong) {
        _stopSong();
    }
    
    if (state.heldNotes.length > 0 && document.getElementById('arp-mode').value !== 'off') {
        startArpeggiator();
    }
}