/*
 * js/effects.js
 * Handles all audio effects ("pedals").
 */
import { audioCtx, audioNodes } from './state.js';
import { makeDistortionCurve } from './audioEngine.js';
import { REVERB_IR_BASE64 } from './constants.js';

// Helper to decode Base64
function _base64ToArrayBuffer(base64) {
    const base64Data = base64.split(',')[1];
    const binaryString = window.atob(base64Data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
}

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

// --- Chorus (NEW) ---

export function initChorus() {
    // Set initial values from the HTML
    const rate = parseFloat(document.getElementById('chorus-rate').value);
    const depth = parseFloat(document.getElementById('chorus-depth').value);
    const mix = parseFloat(document.getElementById('chorus-mix').value);
    
    audioNodes.chorus.lfo.frequency.setValueAtTime(rate, audioCtx.currentTime);
    // Depth is a % of the base 5ms delay. 0.5 depth = 2.5ms swing
    audioNodes.chorus.depth.gain.setValueAtTime(0.005 * depth, audioCtx.currentTime); 
    
    // Set initial mix (which is 'off')
    updateChorusMix(mix, false); // false = don't check 'active' button
}

export function updateChorusRate(rate) {
    if (audioNodes.chorus) {
        audioNodes.chorus.lfo.frequency.linearRampToValueAtTime(rate, audioCtx.currentTime + 0.01);
    }
}

export function updateChorusDepth(depth) {
    if (audioNodes.chorus) {
        // Depth is a % of the base 5ms delay. 0.5 depth = 2.5ms swing
        const depthAmount = 0.005 * depth;
        audioNodes.chorus.depth.gain.linearRampToValueAtTime(depthAmount, audioCtx.currentTime + 0.01);
    }
}

export function updateChorusMix(mix, checkActive = true) {
    if (audioNodes.chorus) {
        // Only update if the pedal is ON, or if we force it
        if (!checkActive || document.getElementById('chorus-bypass-btn').classList.contains('active')) {
            audioNodes.chorus.wet.gain.linearRampToValueAtTime(mix, audioCtx.currentTime + 0.01);
            audioNodes.chorus.dry.gain.linearRampToValueAtTime(1.0 - mix, audioCtx.currentTime + 0.01);
        }
    }
}

export function toggleChorus(isOn) {
    if (audioNodes.chorus) {
        const mix = parseFloat(document.getElementById('chorus-mix').value);
        if (isOn) {
            audioNodes.chorus.wet.gain.linearRampToValueAtTime(mix, audioCtx.currentTime + 0.01);
            audioNodes.chorus.dry.gain.linearRampToValueAtTime(1.0 - mix, audioCtx.currentTime + 0.01);
        } else {
            // Bypassed
            audioNodes.chorus.wet.gain.linearRampToValueAtTime(0, audioCtx.currentTime + 0.01);
            audioNodes.chorus.dry.gain.linearRampToValueAtTime(1, audioCtx.currentTime + 0.01);
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

export function updateDelayMix(mix, checkActive = true) {
    if (audioNodes.delay) {
        if (!checkActive || document.getElementById('delay-bypass-btn').classList.contains('active')) {
            audioNodes.delay.wetGain.gain.linearRampToValueAtTime(mix, audioCtx.currentTime + 0.01);
            audioNodes.delay.dryGain.gain.linearRampToValueAtTime(1.0 - mix, audioCtx.currentTime + 0.01);
        }
    }
}

// --- Reverb ---

export async function initReverb() {
    console.log('Loading Reverb Impulse Response...');
    try {
        const audioData = _base64ToArrayBuffer(REVERB_IR_BASE64);
        const buffer = await audioCtx.decodeAudioData(audioData);
        audioNodes.reverb.convolver.buffer = buffer;
        const initialMix = document.getElementById('reverb-mix').value;
        updateReverbMix(initialMix, false); // false = don't check 'active'
        console.log('Reverb loaded successfully!');
    } catch (e) {
        console.error('Failed to load reverb IR:', e);
    }
}

export function updateReverbMix(mix, checkActive = true) {
    if (audioNodes.reverb) {
        if (!checkActive || document.getElementById('reverb-bypass-btn').classList.contains('active')) {
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
