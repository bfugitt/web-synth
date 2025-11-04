/*
 * js/ui.js
 * Handles all DOM creation and manipulation.
 */

import { state } from './state.js';
import { SCALES, MIDI_NOTE_NAMES, PATCHES } from './constants.js';

// --- Label Updaters ---

export function updateRangeLabel(input, unit = '') {
    const valEl = document.getElementById(input.id + '-val');
    if (valEl) {
        valEl.textContent = input.value + unit;
    }
}

export function updateAllRangeLabels() {
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

// --- Keyboard UI ---

export function updateBaseOctave(value) {
    state.baseOctave = parseInt(value);
    createPianoKeys(); // Re-draw piano keys for new octave
    // We'll need to re-run setupKeyMappings, which is in main.js
    // This highlights the need for a better event system later, but for now
    // we'll call it from the event listener in main.js
}

export function createPianoKeys() {
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

    // This is a bit of a "code smell" - the UI shouldn't really
    // know about noteOn/noteOff. In a future version, we'd
    // have main.js add the listeners. But for this refactor,
    // we'll import them into main.js and attach them there.
    // For now, we need to get the functions from main.js...
    // This is tricky. Let's attach them in main.js.
    // We'll just create the elements here.

    keys.forEach(keyData => {
        const keyEl = document.createElement('div');
        keyEl.className = `key ${keyData.class}`;
        keyEl.id = `key-${keyData.midi}`;
        keyEl.dataset.midi = keyData.midi;
        keyEl.innerHTML = `<div>${keyData.note}</div><div style="font-weight:bold; margin-bottom:5px;">${keyData.key}</div>`;
        pianoKeys.appendChild(keyEl);
    });
}

// --- Sequencer UI ---

export function createGrid() {
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

// --- Song/Pattern UI ---

export function updatePatternDisplay() {
    const displayEl = document.getElementById('pattern-display');
    displayEl.innerHTML = '';
    
    if (state.songPatterns.length === 0) {
        displayEl.innerHTML = '<p style="margin: 0; color: #aaa;">Saved Patterns: None</p>';
        return;
    }
    
    // We have a circular dependency problem if we import song.js here.
    // So, we'll pass the functions this needs (loadPattern, deletePattern)
    // from main.js during initialization.
    // For now, this function is broken until main.js is updated.
    // This is fine, we're doing it all at once.
    
    state.songPatterns.forEach((pattern, index) => {
        const tile = document.createElement('div');
        tile.className = 'pattern-tile';
        const scaleName = SCALES[pattern.state.scale_key]?.name || 'Unknown';
        tile.textContent = `${pattern.name} (${scaleName})`;
        tile.dataset.index = index;

        if (state.isSongPlaying && index === state.currentPatternIndex) {
            tile.classList.add('playing');
        }

        // We will add onclick listeners in main.js
        
        const deleteBtn = document.createElement('button');
        deleteBtn.className = 'delete-btn';
        deleteBtn.textContent = 'X';
        // We will add onclick listeners in main.js

        tile.appendChild(deleteBtn);
        displayEl.appendChild(tile);
    });
}

// --- Dropdown Population ---

export function populatePatchSelector() {
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

export function populateScaleSelector() {
    const selector = document.getElementById('scale-selector');
    selector.innerHTML = '';
    for (const key in SCALES) {
        const option = document.createElement('option');
        option.value = key;
        option.textContent = SCALES[key].name;
        selector.appendChild(option);
    }
}