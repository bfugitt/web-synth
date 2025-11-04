/*
 * js/song.js
 * Handles song and pattern saving, loading, and playback.
 */

import { state } from './state.js';
import { getAllSynthState, loadSynthControls } from './patch.js';
import { createGrid, updatePatternDisplay } from './ui.js';

// We need functions from sequencer.js
let _stopSequencer, _startSequencer;

export function initSong(stopSeqFn, startSeqFn) {
    _stopSequencer = stopSeqFn;
    _startSequencer = startSeqFn;
}

export function savePattern() {
    const pattern = {
        name: `Pattern ${String.fromCharCode(65 + state.songPatterns.length)}`,
        state: getAllSynthState(),
        sequence: state.sequence.map(row => [...row])
    };
    state.songPatterns.push(pattern);
    
    document.getElementById('save-pattern-btn').textContent = `SAVE PATTERN ${String.fromCharCode(65 + state.songPatterns.length)}`;
    updatePatternDisplay(); // This UI function is now safe to call
}

export function loadPattern(index) {
    const pattern = state.songPatterns[index];
    if (!pattern) return;
    
    loadSynthControls(pattern.state);
    
    state.sequence = pattern.sequence.map(row => [...row]);
    createGrid();
}

export function deletePattern(index) {
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

export function advanceSongPattern() {
    if (state.currentPatternIndex >= state.songPatterns.length - 1) {
        stopSong();
        return;
    }
    
    state.currentPatternIndex++;
    state.nextPatternToLoad = state.songPatterns[state.currentPatternIndex]; 
    updatePatternDisplay();
}

export function startStopSong() {
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
            if (_stopSequencer) _stopSequencer();
        }
        
        state.isSongPlaying = true;
        state.currentPatternIndex = 0;
        songBtn.textContent = 'STOP SONG';
        songBtn.classList.add('active');
        
        loadPattern(state.currentPatternIndex);
        updatePatternDisplay();
        
        if (_startSequencer) _startSequencer();
    }
}

export function stopSong() {
    state.isSongPlaying = false;
    state.nextPatternToLoad = null;
    state.currentPatternIndex = 0;
    
    const songBtn = document.getElementById('play-song-btn');
    songBtn.textContent = 'PLAY SONG';
    songBtn.classList.remove('active');
    
    if (state.isPlaying) {
        if (_stopSequencer) _stopSequencer();
    }
    updatePatternDisplay();
}