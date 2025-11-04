/*
 * js/effects.js
 * Handles all audio effects ("pedals").
 */
import { audioCtx, audioNodes } from './state.js';
import { makeDistortionCurve } from './audioEngine.js';

// --- Distortion ---

export function initDistortion() {
    const initialAmount = document.getElementById('distortion-amount').value;
    audioNodes.distortion.waveShaper.curve = makeDistortionCurve(initialAmount);
    audioNodes.distortion.waveShaper.oversample = '4x';
    audioNodes.distortion.wet.gain.value = 0;
    audioNodes.distortion.dry.gain.value = 1;
}

export function updateDistortionAmount(amount) {
    if (audioNodes.distortion) {
        audioNodes.distortion.waveShaper.curve = makeDistortionCurve(amount);
    }
}

export function toggleDistortion(isOn) {
    if (audioNodes.distortion) {
        if (isOn) {
            audioNodes.distortion.wet.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
            audioNodes.distortion.dry.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
        } else {
            audioNodes.distortion.wet.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            audioNodes.distortion.dry.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
        }
    }
}

// --- Delay ---

export function toggleDelay(isOn) {
    if (audioNodes.delay) {
        const mix = parseFloat(document.getElementById('delay-mix').value);
        if (isOn) {
            audioNodes.delay.wetGain.gain.linearRampToValueAtTime(mix, audioCtx.currentTime + 0.01);
            audioNodes.delay.dryGain.gain.linearRampToValueAtTime(1.0 - mix, audioCtx.currentTime + 0.01);
        } else {
            // Bypassed
            audioNodes.delay.wetGain.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            audioNodes.delay.dryGain.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
        }
    }
}

export function updateDelayMix(mix) {
    if (audioNodes.delay) {
        // Only update if the pedal is ON
        if (document.getElementById('delay-bypass-btn').classList.contains('active')) {
            audioNodes.delay.wetGain.gain.linearRampToValueAtTime(mix, audioCtx.currentTime + 0.01);
            audioNodes.delay.dryGain.gain.linearRampToValueAtTime(1.0 - mix, audioCtx.currentTime + 0.01);
        }
    }
}

// --- Reverb (NEW) ---

// This is the working link to a Parking Garage IR
const REVERB_IR_URL = 'https://raw.githubusercontent.com/GoogleChrome/web-audio-samples/main/sounds/impulse-response-1.wav';


// We must load the audio file before we can use the reverb
// 'async' means this function can 'await' the file download
export async function initReverb() {
    console.log('Loading Reverb Impulse Response...');
    try {
        const response = await fetch(REVERB_IR_URL);
        if (!response.ok) {
            throw new Error(`HTTP error! status: ${response.status}`);
        }
        const audioData = await response.arrayBuffer();
        
        // Decode the audio file into a buffer
        const buffer = await audioCtx.decodeAudioData(audioData);
        
        // Set the convolver's buffer to our new sound
        audioNodes.reverb.convolver.buffer = buffer;
        
        // Set initial mix
        const initialMix = document.getElementById('reverb-mix').value;
        updateReverbMix(initialMix);
        
        console.log('Reverb loaded successfully!');
    } catch (e) {
        console.error('Failed to load reverb IR:', e);
    }
}

export function updateReverbMix(mix) {
    if (audioNodes.reverb) {
        // Only update if the pedal is ON
        if (document.getElementById('reverb-bypass-btn').classList.contains('active')) {
            audioNodes.reverb.wet.gain.linearRampToValueAtTime(mix, audioCtx.currentTime + 0.01);
            audioNodes.reverb.dry.gain.linearRampToValueAtTime(1.0 - mix, audioCtx.currentTime + 0.01);
        }
    }
}

export function toggleReverb(isOn) {
    if (audioNodes.reverb) {
        const mix = parseFloat(document.getElementById('reverb-mix').value);
        if (isOn) {
            audioNodes.reverb.wet.gain.linearRampToValueAtTime(mix, audioCtx.currentTime + 0.01);
            audioNodes.reverb.dry.gain.linearRampToValueAtTime(1.0 - mix, audioCtx.currentTime + 0.01);
        } else {
            // Bypassed
            audioNodes.reverb.wet.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            audioNodes.reverb.dry.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
        }
    }
}
