/*
 * js/main.js
 * The central coordinator for the synthesizer.
 * Its only job is to import all the modules and
 * connect them with event listeners.
 */

// Import Core State
import { audioCtx, audioNodes, state } from './state.js';

// Import All Modules
import { 
    initializeGlobalAudioChain, updateVCF, updateDelay, initRealTimeLfo,
    updateLFO, startNote, stopNote 
} from './audioEngine.js';

import { startArpeggiator, stopArpeggiator } from './arpeggiator.js';

import { initPatcher, loadSynthControls, loadPatch } from './patch.js';

import { 
    initRecorder, startRecording 
} from './recorder.js';

import { 
    initSequencer, clearGrid, loadScale, startStopSequencer, 
    startSequencer, // <<< --- THIS WAS THE MISSING PIECE
    stopSequencer, setAdvanceSongFn, setStopSongFn 
} from './sequencer.js';

import { 
    initSong, savePattern, deletePattern, loadPattern, 
    advanceSongPattern, startStopSong, stopSong 
} from './song.js';

import { 
    updateRangeLabel, updateAllRangeLabels, updateBaseOctave, 
    createPianoKeys, createGrid, updatePatternDisplay, 
    populatePatchSelector, populateScaleSelector 
} from './ui.js';


// --- Keyboard Interaction Logic ---
// These functions are the "glue" between UI, Audio, and Arp
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

function updateHeldNotes(midiNote, isAdding) {
    const index = state.heldNotes.indexOf(midiNote);
    if (isAdding && index === -1) {
        state.heldNotes.push(midiNote);
    } else if (!isAdding && index > -1) {
        state.heldNotes.splice(index, 1);
    }
    state.heldNotes.sort((a, b) => a - b);

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


// --- Main Initialization ---
document.addEventListener('DOMContentLoaded', () => {
    
    // --- 1. Connect Modules ---
    // Pass functions to modules that need them to avoid circular dependencies
    initPatcher(loadScale);
    initSequencer(loadSynthControls, createGrid, setupKeyMappings);
    initSong(stopSequencer, startSequencer); // This line will now work!
    initRecorder(stopSong);
    setAdvanceSongFn(advanceSongPattern);
    setStopSongFn(stopSong);

    // --- 2. Initialize Systems ---
    initializeGlobalAudioChain();
    populatePatchSelector();
    populateScaleSelector();
    loadScale(); // This will also call createGrid
    createPianoKeys();
    initRealTimeLfo();
    updateAllRangeLabels();
    updatePatternDisplay();
    setupKeyMappings();

    // --- 3. Attach All Event Listeners ---

    // -- Audio Controls --
    document.getElementById('vco1-wave').onchange = (e) => state.vco1Wave = e.target.value;
    document.getElementById('vco2-wave').onchange = (e) => state.vco2Wave = e.target.value;
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

    // -- Patch --
    document.getElementById('load-patch-btn').onclick = () => {
        loadPatch();
        clearGrid(); // Patches should clear the grid
    };

    // -- Arp --
    document.getElementById('arp-mode').onchange = startArpeggiator;
    document.getElementById('arp-rate').onchange = startArpeggiator;
    document.getElementById('arp-chords').onchange = startArpeggiator;
    document.getElementById('arp-octaves').onchange = startArpeggiator;

    // -- Keyboard & UI --
    document.getElementById('octave-selector').onchange = (e) => {
        updateBaseOctave(e.target.value);
        setupKeyMappings(); // Re-map keys when octave changes
    };
    
    // Attach listeners to piano keys (since they are now dumb elements)
    document.getElementById('piano-keys').addEventListener('mousedown', e => {
        if (e.target.classList.contains('key')) {
            noteOn(e.target.dataset.midi);
            e.target.classList.add('active');
        }
    });
    document.getElementById('piano-keys').addEventListener('mouseup', e => {
        if (e.target.classList.contains('key')) {
            noteOff(e.target.dataset.midi);
            e.target.classList.remove('active');
        }
    });
    document.getElementById('piano-keys').addEventListener('mouseleave', e => {
        if (e.buttons === 1 && e.target.classList.contains('key')) {
            noteOff(e.target.dataset.midi);
            e.target.classList.remove('active');
        }
    }, true);
    
    // PC Keyboard listeners
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
        const key = e.key.toUpperCase.toUpperCase();
        if (keyToMidi[key]) {
            const midiNote = keyToMidi[key]();
            noteOff(midiNote);
            document.getElementById(`key-${midiNote}`)?.classList.remove('active');
        }
    });

    // -- Sequencer & Transport --
    document.getElementById('scale-selector').onchange = loadScale;
    document.getElementById('play-btn').onclick = startStopSequencer;
    document.getElementById('stop-btn').onclick = stopSequencer;
    document.getElementById('clear-btn').onclick = clearGrid;
    
    // -- Song --
    document.getElementById('save-pattern-btn').onclick = savePattern;
    document.getElementById('play-song-btn').onclick = startStopSong;

    // Attach listeners for pattern tiles (since they are now dumb elements)
    document.getElementById('pattern-display').addEventListener('click', e => {
        const tile = e.target.closest('.pattern-tile');
        if (!tile) return;

        const index = tile.dataset.index;
        if (e.target.classList.contains('delete-btn')) {
            deletePattern(index);
        } else {
            if (state.isPlaying) stopSequencer();
            loadPattern(index);
        }
    });

    // -- Recorder --
    document.getElementById('record-btn').onclick = startRecording;
});