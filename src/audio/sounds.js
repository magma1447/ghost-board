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
