/*
 * js/constants.js
 * This file contains all the static data for the synth.
 * It exports them so other modules can import and use them.
 */

// 'export' makes this available to other files
export const MIDI_NOTE_NAMES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

export const SCALES = {
    'major': {
        name: "Ionian (Major)",
        offsets: [0, 2, 4, 5, 7, 9, 11, 12]
    },
    'dorian': {
        name: "Dorian",
        offsets: [0, 2, 3, 5, 7, 9, 10, 12]
    },
    'phrygian': {
        name: "Phrygian",
        offsets: [0, 1, 3, 5, 7, 8, 10, 12]
    },
    'lydian': {
        name: "Lydian",
        offsets: [0, 2, 4, 6, 7, 9, 11, 12]
    },
    'mixolydian': {
        name: "Mixolydian",
        offsets: [0, 2, 4, 5, 7, 9, 10, 12]
    },
    'minor': { // Aeolian
        name: "Aeolian (Minor)",
        offsets: [0, 2, 3, 5, 7, 8, 10, 12]
    },
    'locrian': {
        name: "Locrian",
        offsets: [0, 1, 3, 5, 6, 8, 10, 12]
    }
};

export const ARP_CHORD_INTERVALS = {
    'held_notes': null,                   // Placeholder for the classic logic (cycles all held notes)
    'major_triad': [0, 4, 7],             // Root, Major Third, Perfect Fifth
    'minor_triad': [0, 3, 7],             // Root, Minor Third, Perfect Fifth
    'seventh_chord': [0, 4, 7, 10],       // Root, Major Third, Perfect Fifth, Minor Seventh (Dominant 7th)
    'fifth_chord': [0, 7]                 // Root, Perfect Fifth (Power Chord)
};

export const PATCHES = {
    default: {
        vco1_wave: 'sawtooth',
        vco1_range: '0',
        vco1_fine_tune: '0.0',
        vco1_level: '0.7',
        vco2_wave: 'sawtooth',
        vco2_range: '0',
        vco2_fine_tune: '0.0',
        vco2_level: '0.7',
        attack: '0.05',
        decay: '0.2',
        sustain: '0.5',
        release: '0.5',
        cutoff: '10000',
        resonance: '1.0',
        lfo_vcf_depth: '0',
        lfo_rate: '5.0',
        lfo_wave: 'sine',
        lfo_vco1_depth: '0.0',
        lfo_vco2_depth: '0.0',
        noise_level: '0.00',
        delay_time: '0.5',
        delay_feedback: '0.3',
        delay_mix: '0.5',
        master_volume: '0.7',
        scale_key: 'major',
        arp_chords: 'held_notes' // DEFAULT: Held Notes
    },
    bass_pluck: {
        vco1_wave: 'square',
        vco1_range: '12',
        vco1_fine_tune: '0.0',
        vco1_level: '0.9',
        vco2_wave: 'square',
        vco2_range: '12',
        vco2_fine_tune: '0.05',
        vco2_level: '0.7',
        attack: '0.01',
        decay: '0.3',
        sustain: '0.0',
        release: '0.3',
        cutoff: '800',
        resonance: '2.0',
        lfo_vcf_depth: '0',
        lfo_rate: '0.1',
        lfo_wave: 'sine',
        lfo_vco1_depth: '0.0',
        lfo_vco2_depth: '0.0',
        noise_level: '0.00',
        delay_time: '0.01',
        delay_feedback: '0.1',
        delay_mix: '0.0',
        master_volume: '0.8',
        scale_key: 'minor',
        arp_chords: 'held_notes'
    },
    arp_dream: {
        vco1_wave: 'triangle',
        vco1_range: '0',
        vco1_fine_tune: '0.0',
        vco1_level: '1.0',
        vco2_wave: 'sine',
        vco2_range: '-12',
        vco2_fine_tune: '0.0',
        vco2_level: '0.8',
        attack: '0.2',
        decay: '0.5',
        sustain: '0.7',
        release: '1.5',
        cutoff: '8000',
        resonance: '1.5',
        lfo_vcf_depth: '2000',
        lfo_rate: '0.5',
        lfo_wave: 'sine',
        lfo_vco1_depth: '0.1',
        lfo_vco2_depth: '0.0',
        noise_level: '0.00',
        delay_time: '0.8',
        delay_feedback: '0.6',
        delay_mix: '0.7',
        master_volume: '0.6',
        scale_key: 'major',
        arp_chords: 'seventh_chord'
    },
    lfo_wobble: {
        vco1_wave: 'sawtooth',
        vco1_range: '12',
        vco1_fine_tune: '0.0',
        vco1_level: '0.8',
        vco2_wave: 'square',
        vco2_range: '12',
        vco2_fine_tune: '0.05',
        vco2_level: '0.8',
        attack: '0.1',
        decay: '0.4',
        sustain: '0.5',
        release: '0.6',
        cutoff: '12000',
        resonance: '5.0',
        lfo_vcf_depth: '5000',
        lfo_rate: '8.0',
        lfo_wave: 'square',
        lfo_vco1_depth: '0.0',
        lfo_vco2_depth: '0.0',
        noise_level: '0.00',
        delay_time: '0.01',
        delay_feedback: '0.0',
        delay_mix: '0.0',
        master_volume: '0.7',
        scale_key: 'dorian',
        arp_chords: 'minor_triad'
    },
    noise_perc: {
        vco1_wave: 'sine',
        vco1_range: '24',
        vco1_fine_tune: '0.0',
        vco1_level: '0.0',
        vco2_wave: 'sine',
        vco2_range: '24',
        vco2_fine_tune: '0.0',
        vco2_level: '0.0',
        attack: '0.01',
        decay: '0.1',
        sustain: '0.0',
        release: '0.1',
        cutoff: '15000',
        resonance: '0.1',
        lfo_vcf_depth: '0',
        lfo_rate: '5.0',
        lfo_wave: 'sine',
        lfo_vco1_depth: '0.0',
        lfo_vco2_depth: '0.0',
        noise_level: '1.00',
        delay_time: '0.01',
        delay_feedback: '0.0',
        delay_mix: '0.0',
        master_volume: '0.8',
        scale_key: 'major',
        arp_chords: 'held_notes'
    }
};