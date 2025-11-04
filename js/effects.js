/*
 * js/effects.js
 * Handles all audio effects ("pedals").
 */
import { audioCtx, audioNodes } from './state.js';
// --- THIS IS THE BUG FIX ---
// Import the helper function from its *correct* location
import { makeDistortionCurve } from './audioEngine.js';
// --- END BUG FIX ---

// Initialize the distortion pedal
export function initDistortion() {
    // The nodes are already created by audioEngine.js.
    // We just need to set their initial values.
    
    // Set default curve from the '100' value in the HTML
    const initialAmount = document.getElementById('distortion-amount').value;
    audioNodes.distortion.waveShaper.curve = makeDistortionCurve(initialAmount);
    audioNodes.distortion.waveShaper.oversample = '4x';
    
    // Default state is "off" (bypassed).
    audioNodes.distortion.wet.gain.value = 0;
    audioNodes.distortion.dry.gain.value = 1;
}

// Called by the slider
export function updateDistortionAmount(amount) {
    if (audioNodes.distortion) {
        audioNodes.distortion.waveShaper.curve = makeDistortionCurve(amount);
    }
}

// Called by the on/off button
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
