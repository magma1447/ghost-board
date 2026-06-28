// Sound synthesis using Web Audio API — no external files needed

let ctx = null;

function getCtx() {
    if (!ctx) {
        ctx = new AudioContext();
    }
    return ctx;
}

// Resume audio context on first user interaction (browser policy)
export function ensureAudio() {
    const c = getCtx();
    if (c.state === 'suspended') {
        c.resume();
    }
}

// -- Utility: create a noise buffer --
let noiseBuffer = null;
function getNoise() {
    const c = getCtx();
    if (noiseBuffer) {
        return noiseBuffer;
    }
    const size = c.sampleRate * 0.5;
    noiseBuffer = c.createBuffer(1, size, c.sampleRate);
    const data = noiseBuffer.getChannelData(0);
    for (let i = 0; i < size; i++) {
        data[i] = Math.random() * 2 - 1;
    }
    return noiseBuffer;
}

// -- Utility: play a noise burst with filter --
function noiseBurst(startTime, duration, filterType, filterFreq, gain) {
    const c = getCtx();
    const src = c.createBufferSource();
    src.buffer = getNoise();

    const filter = c.createBiquadFilter();
    filter.type = filterType;
    filter.frequency.value = filterFreq;

    const env = c.createGain();
    env.gain.setValueAtTime(gain, startTime);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    src.connect(filter).connect(env).connect(c.destination);
    src.start(startTime);
    src.stop(startTime + duration);
}

// -- Utility: play a tone --
function tone(startTime, duration, freq, type, gain, pitchEnd) {
    const c = getCtx();
    const osc = c.createOscillator();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, startTime);
    if (pitchEnd) {
        osc.frequency.exponentialRampToValueAtTime(pitchEnd, startTime + duration);
    }

    const env = c.createGain();
    env.gain.setValueAtTime(gain, startTime);
    env.gain.exponentialRampToValueAtTime(0.001, startTime + duration);

    osc.connect(env).connect(c.destination);
    osc.start(startTime);
    osc.stop(startTime + duration);
}

// ============================================================
// Themes
// ============================================================

const themes = {
    // -- IMPACT: deep thuds --
    impact: {
        single(t) {
            noiseBurst(t, 0.12, 'lowpass', 250, 0.8);
            tone(t, 0.1, 80, 'sine', 0.5, 40);
        },
        double(t) {
            this.single(t);
            this.single(t + 0.09);
        },
        triple(t) {
            this.single(t);
            this.single(t + 0.08);
            this.single(t + 0.16);
        },
        bull(t) {
            noiseBurst(t, 0.15, 'lowpass', 500, 1.0);
            noiseBurst(t + 0.05, 0.4, 'lowpass', 120, 0.8);
            tone(t, 0.5, 40, 'sine', 0.9, 18);
            tone(t, 0.3, 80, 'sine', 0.4, 35);
            tone(t + 0.02, 0.15, 200, 'sine', 0.3, 60);
        },
        switchPlayer(t) {
            noiseBurst(t, 0.08, 'highpass', 1500, 0.3);
            tone(t, 0.1, 300, 'sine', 0.25, 500);
        },
        bust(t) {
            tone(t, 0.3, 200, 'sawtooth', 0.4, 60);
            noiseBurst(t, 0.2, 'lowpass', 300, 0.5);
        },
        win(t) {
            tone(t, 0.15, 523, 'sine', 0.4);
            tone(t + 0.15, 0.15, 659, 'sine', 0.4);
            tone(t + 0.3, 0.15, 784, 'sine', 0.4);
            tone(t + 0.45, 0.3, 1047, 'sine', 0.5);
        },
    },

    // -- GUNSHOT: snappy shots --
    gunshot: {
        single(t) {
            noiseBurst(t, 0.06, 'bandpass', 2500, 0.9);
            noiseBurst(t, 0.03, 'highpass', 3000, 0.4);
            tone(t, 0.04, 150, 'sine', 0.5, 50);
        },
        double(t) {
            this.single(t);
            this.single(t + 0.12);
        },
        triple(t) {
            this.single(t);
            this.single(t + 0.1);
            this.single(t + 0.2);
        },
        bull(t) {
            noiseBurst(t, 0.25, 'lowpass', 400, 1.0);
            noiseBurst(t, 0.15, 'bandpass', 1200, 0.6);
            tone(t, 0.3, 60, 'sine', 0.8, 20);
        },
        switchPlayer(t) {
            noiseBurst(t, 0.04, 'bandpass', 3000, 0.4);
            tone(t, 0.06, 400, 'sine', 0.2, 600);
        },
        bust(t) {
            noiseBurst(t, 0.15, 'bandpass', 1500, 0.6);
            tone(t, 0.2, 150, 'sawtooth', 0.3, 40);
        },
        win(t) {
            noiseBurst(t, 0.05, 'bandpass', 2500, 0.3);
            tone(t, 0.1, 600, 'sine', 0.3);
            tone(t + 0.12, 0.1, 800, 'sine', 0.3);
            tone(t + 0.24, 0.15, 1000, 'sine', 0.35);
            tone(t + 0.4, 0.25, 1200, 'sine', 0.4);
        },
    },

    // -- ARCADE: retro blips --
    arcade: {
        single(t) {
            tone(t, 0.1, 660, 'square', 0.3, 330);
        },
        double(t) {
            tone(t, 0.08, 523, 'square', 0.3, 400);
            tone(t + 0.1, 0.08, 659, 'square', 0.3, 500);
        },
        triple(t) {
            tone(t, 0.07, 523, 'square', 0.25, 450);
            tone(t + 0.09, 0.07, 659, 'square', 0.25, 550);
            tone(t + 0.18, 0.07, 784, 'square', 0.25, 660);
        },
        bull(t) {
            tone(t, 0.15, 880, 'square', 0.35, 220);
            tone(t + 0.05, 0.2, 440, 'sawtooth', 0.2, 110);
        },
        switchPlayer(t) {
            tone(t, 0.06, 523, 'square', 0.2);
            tone(t + 0.08, 0.06, 659, 'square', 0.2);
            tone(t + 0.16, 0.08, 784, 'square', 0.25);
        },
        bust(t) {
            tone(t, 0.15, 440, 'square', 0.3, 110);
            tone(t + 0.15, 0.2, 220, 'square', 0.25, 55);
        },
        win(t) {
            tone(t, 0.1, 523, 'square', 0.25);
            tone(t + 0.12, 0.1, 659, 'square', 0.25);
            tone(t + 0.24, 0.1, 784, 'square', 0.25);
            tone(t + 0.36, 0.1, 1047, 'square', 0.3);
            tone(t + 0.5, 0.3, 1047, 'square', 0.2);
        },
    },
};

// ============================================================
// Public API
// ============================================================

let currentTheme = 'impact';

export function setTheme(name) {
    if (themes[name]) {
        currentTheme = name;
    }
}

export function getTheme() {
    return currentTheme;
}

export function getThemeNames() {
    return Object.keys(themes);
}

export function playSwitch() {
    ensureAudio();
    const t = getCtx().currentTime;
    const theme = themes[currentTheme];
    if (theme.switchPlayer) {
        theme.switchPlayer(t);
    }
}

export function playChime() {
    ensureAudio();
    const t = getCtx().currentTime;
    tone(t, 0.12, 1200, 'sine', 0.2);
    tone(t, 0.15, 1800, 'sine', 0.1);
}

export function playBust() {
    ensureAudio();
    const t = getCtx().currentTime;
    const theme = themes[currentTheme];
    if (theme.bust) {
        theme.bust(t);
    }
}

export function playWin() {
    ensureAudio();
    const t = getCtx().currentTime;
    const theme = themes[currentTheme];
    if (theme.win) {
        theme.win(t);
    }
}

// -- Speech synthesis for score calling --

let selectedVoiceName = null;

export function getVoices() {
    if (!window.speechSynthesis) {
        return [];
    }
    return window.speechSynthesis.getVoices();
}

export function getVoiceNames() {
    return getVoices().map((v) => v.name);
}

export function setVoice(name) {
    selectedVoiceName = name;
}

function applyVoice(utterance) {
    if (!selectedVoiceName) {
        return;
    }
    const voice = getVoices().find((v) => v.name === selectedVoiceName);
    if (voice) {
        utterance.voice = voice;
    }
}

export function speakScore(points) {
    if (!window.speechSynthesis) {
        return;
    }
    window.speechSynthesis.cancel();

    if (points === 180) {
        const u = new SpeechSynthesisUtterance('one hundred and eighty!');
        u.rate = 0.4;
        u.pitch = 1.3;
        u.volume = 1.0;
        applyVoice(u);
        window.speechSynthesis.speak(u);
        return;
    }

    const utterance = new SpeechSynthesisUtterance(String(points));
    utterance.rate = 1.1;
    utterance.pitch = 1.0;
    utterance.volume = 0.8;
    applyVoice(utterance);
    window.speechSynthesis.speak(utterance);
}

export function playHit(ring) {
    ensureAudio();
    const t = getCtx().currentTime;
    const theme = themes[currentTheme];

    switch (ring) {
    case 'D':
        theme.double(t);
        break;
    case 'T':
        theme.triple(t);
        break;
    case 'SBULL':
    case 'DBULL':
        theme.bull(t);
        break;
    case 'SO':
    case 'SI':
    default:
        theme.single(t);
        break;
    }
}
