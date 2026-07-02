// Persistent settings via localStorage

const STORAGE_KEY = 'ghost-board-settings';

const DEFAULTS = {
    // Global player registry — array of { uuid, name }, shared across games
    players: [],
    // Last-used player selection (array of UUIDs), for pre-filling setup
    lastPlayers: [],
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
    },
    debug: {
        mouseInput: false,
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
