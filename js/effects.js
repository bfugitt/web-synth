/*
 * js/effects.js
 * Handles all audio effects ("pedals").
 */
import { audioCtx, audioNodes } from './state.js';
import { makeDistortionCurve } from './audioEngine.js';
import { REVERB_IR_BASE64 } from './constants.js';

// --- THIS IS THE FIX ---
// Helper function to decode a Base64 string into an ArrayBuffer
function _base64ToArrayBuffer(base64) {
    // 1. Get the raw base64 data (remove the 'data:audio/wav;base64,' prefix)
    const base64Data = base64.split(',')[1];
    // 2. Convert from base64 to a "binary" string
    const binaryString = window.atob(base64Data);
    // 3. Get the length of that string
    const len = binaryString.length;
    // 4. Create an array of 8-bit integers (a byte array)
    const bytes = new Uint8Array(len);
    // 5. Loop through and store the character codes of each character
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    // 6. Return the underlying ArrayBuffer
    return bytes.buffer;
}
// --- END FIX ---


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

export async function initReverb() {
    console.log('Loading Reverb Impulse Response...');
    try {
        // --- THIS IS THE FIX ---
        // 1. Decode the Base64 string into an ArrayBuffer
        const audioData = _base64ToArrayBuffer(REVERB_IR_BASE64);
        // --- END FIX ---

        // 2. Decode the ArrayBuffer into an AudioBuffer
        const buffer = await audioCtx.decodeAudioData(audioData);
        
        // 3. Set the convolver's buffer to our new sound
        audioNodes.reverb.convolver.buffer = buffer;
        
        // 4. Set initial mix
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
