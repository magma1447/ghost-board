// Shared formatting helpers for game panels and setup screens

export function formatDart(dart) {
    if (dart.ring === 'OUT') {
        return 'Miss';
    }
    if (dart.ring === 'DBULL') {
        return 'BULL';
    }
    if (dart.ring === 'SBULL') {
        return 'Bull';
    }
    const prefix = { D: 'D', T: 'T', SO: 'S', SI: 'S' }[dart.ring];
    return `${prefix}${dart.segment}`;
}

export function formatBool(value) {
    return value ? 'on' : 'off';
}

export function formatRounds(value) {
    return value === 0 ? 'no limit' : String(value);
}

// In-game round indicator: "Round 3 / 20", or "Round 3" when there's no limit
export function formatRoundLabel(round, maxRounds) {
    return maxRounds > 0 ? `Round ${round} / ${maxRounds}` : `Round ${round}`;
}
