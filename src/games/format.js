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

// Describe the notable settings from a field schema + values, as labeled
// tokens (e.g. "Hit mode: Doubles only", "Double out", "Max rounds: 20").
// Checkboxes show their label only when on; selects show "Label: value" only
// when changed from the default. Shared by the in-game settings line and the
// setup options summary so the wording stays consistent.
export function describeSettings(fields, values, defaults) {
    const tokens = [];
    for (const field of fields) {
        const value = values[field.name];
        // Skip settings the source object doesn't carry (some options are kept
        // as game-internal closures, not in the persisted state).
        if (value === undefined) {
            continue;
        }
        if (field.type === 'checkbox') {
            if (value) {
                tokens.push(field.label);
            }
        } else if (String(value) !== String(defaults[field.name])) {
            const opt = (field.options || []).find((o) => String(o.value) === String(value));
            tokens.push(`${field.label}: ${opt ? opt.label : value}`);
        }
    }
    return tokens;
}

// Joining separator for a settings line (pipe avoids clashing with option
// labels that contain commas/slashes, e.g. "Staggered (1, 2, 3)").
export const SETTINGS_SEPARATOR = ' | ';

// The in-game settings line: the notable settings joined and prefixed with a
// label (the in-game card has no section header). Empty when nothing notable,
// so the line stays hidden. (The setup summary uses describeSettings directly
// since it already sits under a "Game options" header.)
export function settingsLine(fields, values, defaults) {
    const tokens = describeSettings(fields, values, defaults);
    return tokens.length > 0 ? `Game options: ${tokens.join(SETTINGS_SEPARATOR)}` : '';
}
