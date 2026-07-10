// Persistent settings via localStorage

const STORAGE_KEY = 'ghost-board-settings';

// AI throw pacing presets (ms between an AI's darts) — the single source for
// both the Debug-menu picker (main.js) and the default below.
export const AI_SPEED_OPTIONS = [
    { label: 'Fast', ms: 500 },
    { label: 'Normal', ms: 1500, default: true },
    { label: 'Slow', ms: 3000 },
];

const DEFAULT_THROW_MS = AI_SPEED_OPTIONS.find((o) => o.default).ms;

const DEFAULTS = {
    // Global player registry — array of { uuid, name }, shared across games
    players: [],
    // Last-used player selection (array of UUIDs), for pre-filling setup
    lastPlayers: [],
    // Last-used team line-up ([{ name, members: [uuid] }]); [] = individuals.
    // Re-seeds the setup roster so a team night carries over between games.
    lastTeams: [],
    audio: {
        theme: 'impact',
        voice: '',
        callTurnTotal: true,
        callRemaining: true,
        callCheckout: true,
    },
    display: {
        bigNumber: true,
        boardTheme: 'green',
        uiScale: 110,
        idleLeds: 'both', // idle attract animation: 'both' | 'board' | 'none'
    },
    debug: {
        mouseInput: false,
        aiMarks: false, // draw AI aim + hit marks on the board (debugging)
    },
    ai: {
        level: 5, // last-used AI difficulty (1–10), remembered by the level picker
        throwMs: DEFAULT_THROW_MS, // pacing between an AI's darts (ms) — the "Normal" preset
    },
};

let current = null;

// Fields where the old `0` sentinel meant "no limit" / "off"; migrated to the
// self-documenting `null` when the numeric selector rolled out.
const ZERO_TO_NULL = [
    ['x01', 'maxRounds'],
    ['x01', 'checkoutThreshold'],
    ['aroundTheClock', 'maxRounds'],
    ['catAndMouse', 'maxRounds'],
    ['simonSays', 'maxRounds'],
];

function migrate(settings) {
    for (const [key, field] of ZERO_TO_NULL) {
        if (settings[key] && settings[key][field] === 0) {
            settings[key][field] = null;
        }
    }
    return settings;
}

function load() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (raw) {
            const stored = JSON.parse(raw);
            // Merge with defaults so new keys are always present
            return migrate(merge(DEFAULTS, stored));
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
        } else {
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
        if (!obj[keys[i]]) {
            obj[keys[i]] = {};
        }
        obj = obj[keys[i]];
    }
    obj[keys[keys.length - 1]] = value;
    save();
}
