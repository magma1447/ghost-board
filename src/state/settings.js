// Persistent settings via localStorage

const STORAGE_KEY = 'ghost-board-settings';

const DEFAULTS = {
  audio: {
    theme: 'impact',
    voice: '',
    callTurnTotal: true,
    callRemaining: true,
    callCheckout: true,
  },
  debug: {
    mouseInput: false,
  },
  x01: {
    startingScore: 501,
    doubleIn: false,
    doubleOut: true,
    bullMode: '25/50',
    maxRounds: 20,
    checkoutThreshold: 170,
  },
  aroundTheClock: {
    bullFinish: 'single',
    hitMode: 'any',
    multiStep: false,
    maxRounds: 0,
  },
};

export const X01_DEFAULTS = DEFAULTS.x01;
export const AROUND_THE_CLOCK_DEFAULTS = DEFAULTS.aroundTheClock;

let current = null;

function load() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const stored = JSON.parse(raw);
      // Merge with defaults so new keys are always present
      return merge(DEFAULTS, stored);
    }
  } catch {
    // Corrupted data — reset
  }
  return structuredClone(DEFAULTS);
}

function merge(defaults, overrides) {
  const result = structuredClone(defaults);
  for (const key of Object.keys(overrides)) {
    if (key in result && typeof result[key] === 'object' && !Array.isArray(result[key])) {
      result[key] = merge(result[key], overrides[key]);
    } else if (key in defaults) {
      result[key] = overrides[key];
    }
  }
  return result;
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(current));
}

export function settings() {
  if (!current) {
    current = load();
  }
  return current;
}

export function updateSettings(path, value) {
  if (!current) {
    current = load();
  }
  const keys = path.split('.');
  let obj = current;
  for (let i = 0; i < keys.length - 1; i++) {
    obj = obj[keys[i]];
  }
  obj[keys[keys.length - 1]] = value;
  save();
}
