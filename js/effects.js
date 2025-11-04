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
    // Create all the nodes for this pedal
    audioNodes.distortion = {
        input: audioCtx.createGain(),
        waveShaper: audioCtx.createWaveShaper(),
        wet: audioCtx.createGain(),
        dry: audioCtx.createGain(),
        output: audioCtx.createGain()
    };
    
    // Create the signal path
    // input -> dry -> output
    // input -> waveShaper -> wet -> output
    audioNodes.distortion.input.connect(audioNodes.distortion.dry).connect(audioNodes.distortion.output);
    audioNodes.distortion.input.connect(audioNodes.distortion.waveShaper).connect(audioNodes.distortion.wet).connect(audioNodes.distortion.output);

    // Set default state (bypassed/off)
    audioNodes.distortion.wet.gain.value = 0;
    audioNodes.distortion.dry.gain.value = 1;
    
    // Set default curve
    audioNodes.distortion.waveShaper.curve = makeDistortionCurve(100);
    audioNodes.distortion.waveShaper.oversample = '4x';
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
