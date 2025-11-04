/*
 * js/effects.js
 * Handles all audio effects ("pedals").
 */
import { audioCtx, audioNodes } from './state.js';

// --- Distortion ---

// Helper function to create the distortion "curve"
function makeDistortionCurve(amount) {
    let k = typeof amount === 'number' ? amount : 50,
        n_samples = 44100,
        curve = new Float32Array(n_samples),
        deg = Math.PI / 180,
        i = 0,
        x;
    for ( ; i < n_samples; ++i ) {
        x = i * 2 / n_samples - 1;
        curve[i] = ( 3 + k ) * x * 20 * deg / ( Math.PI + k * Math.abs(x) );
    }
    return curve;
};

// Initialize the distortion pedal
export function initDistortion() {
    // BUG FIX:
    // DO NOT create new nodes here.
    // The nodes are already created by audioEngine.js.
    // We just need to set their initial values.
    
    // Set default curve from the '100' value in the HTML
    const initialAmount = document.getElementById('distortion-amount').value;
    audioNodes.distortion.waveShaper.curve = makeDistortionCurve(initialAmount);
    audioNodes.distortion.waveShaper.oversample = '4x';
    
    // Default state is "off" (bypassed).
    // This is already set in audioEngine.js, but
    // we can confirm it here.
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
