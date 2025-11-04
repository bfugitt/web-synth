/*
 * js/arpeggiator.js
 * Contains all logic for the arpeggiator.
 */

// Import constants
import { ARP_CHORD_INTERVALS } from './constants.js';
// Import shared state
import { state } from './state.js';
// Import audio functions
import { startNote, stopNote } from './audioEngine.js';


export function getArpParams() {
    return {
        mode: document.getElementById('arp-mode').value,
        rateFactor: parseInt(document.getElementById('arp-rate').value),
        octaves: parseInt(document.getElementById('arp-octaves').value),
        chordSequence: document.getElementById('arp-chords').value
    };
}

export function calculateArpNote(notes, index, mode, octaves, chordSequence) {
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

export function startArpeggiator() {
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

export function stopArpeggiator() {
    clearInterval(state.arpeggiatorInterval);
    state.arpeggiatorInterval = null;
    state.arpIndex = 0;
    Object.keys(state.activeVoices).forEach(note => {
        while (state.activeVoices[note] && state.activeVoices[note].length > 0) {
            stopNote(parseInt(note));
        }
    });
}