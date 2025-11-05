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
breathy: {
  "vco1_wave": "sawtooth",
  "vco1_range": "-12",
  "vco1_fine_tune": "-0.06",
  "vco1_level": "0.2",
  "vco2_wave": "sine",
  "vco2_range": "-12",
  "vco2_fine_tune": "0",
  "vco2_level": "0.91",
  "attack": "0.38",
  "decay": "0.2",
  "sustain": "0.6",
  "release": "1.65",
  "cutoff": "3500",
  "resonance": "5.8",
  "lfo_vcf_depth": "480",
  "lfo_rate": "0.2",
  "lfo_wave": "sine",
  "lfo_vco1_depth": "0",
  "lfo_vco2_depth": "0",
  "noise_level": "0.1",
  "master_volume": "0.88",
  "arp_mode": "off",
  "arp_rate": "1",
  "arp_chords": "held_notes",
  "arp_octaves": "2",
  "bpm": "120",
  "scale_key": "major",
  "baseOctave": "60",
  "distortion_amount": "125",
  "distortion_on": false,
  "chorus_rate": "1.5",
  "chorus_depth": "0.5",
  "chorus_mix": "0.5",
  "chorus_on": false,
  "delay_time": "0.13",
  "delay_feedback": "0.31",
  "delay_mix": "0.26",
  "delay_on": true,
  "reverb_mix": "0.5",
  "reverb_on": false
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
}; // This is the correct closing brace for PATCHES

// Base64 Data URL for a small, free impulse response (reverb)
export const REVERB_IR_BASE64 = 'data:audio/wav;base64,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';

// NOTE: No extra '};' here!
