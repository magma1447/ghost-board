// Shared option-field fragments — factory functions for the field descriptors
// that several games repeat verbatim (tie handling, bull scoring, hit mode,
// number sets, round limits). Games call these in their `fields` arrays so the
// wording and values stay in sync across games; each call returns a fresh
// object with the game's own default baked into the hint.

import { formatRounds } from './format.js';

const ON_DRAW_LABELS = { draw: 'draw', continue: 'play until a winner' };

// "On a tie" — draw vs sudden-death tie-breaker.
export function onDrawField(defaultValue) {
    return {
        name: 'onDraw', label: 'On a tie', type: 'select',
        defaultHint: ON_DRAW_LABELS[defaultValue],
        options: [
            { value: 'draw', label: 'Draw' },
            { value: 'continue', label: 'Play until a winner' },
        ],
    };
}

// Bull scoring — standard 25/50 vs flat 50/50 (soft-tip convention).
export function bullModeField(defaultValue) {
    return {
        name: 'bullMode', label: 'Bull scoring', type: 'select',
        defaultHint: defaultValue,
        options: [
            { value: '25/50', label: '25 / 50 (standard)' },
            { value: '50/50', label: '50 / 50' },
        ],
    };
}

// Which ring counts as a hit on the current target.
export function hitModeField(defaultValue) {
    return {
        name: 'hitMode', label: 'Hit mode', type: 'select',
        defaultHint: defaultValue,
        options: [
            { value: 'any', label: 'Any' },
            { value: 'doubles', label: 'Doubles only' },
            { value: 'trebles', label: 'Trebles only' },
        ],
    };
}

const NUMBER_LABELS = { standard: '15–20 + bull', fixed14: '14–20 (no bull)', randomBull: 'random w/ bull', randomNoBull: 'random w/o bull' };

// Cricket-style number selection.
export function numberSetField(defaultValue) {
    return {
        name: 'numberSet', label: 'Numbers', type: 'select',
        defaultHint: NUMBER_LABELS[defaultValue],
        options: [
            { value: 'standard', label: '15–20 + bull' },
            { value: 'fixed14', label: '14–20 (no bull)' },
            { value: 'randomBull', label: 'Random w/ bull' },
            { value: 'randomNoBull', label: 'Random w/o bull' },
        ],
    };
}

// Round limit. `presets`/`max`/`label` vary per game; `noLimit: true` adds the
// "No limit" preset (value null) and formats null as "no limit".
export function maxRoundsField(defaultValue, { label = 'Rounds', presets, max, noLimit = false }) {
    const field = {
        name: 'maxRounds', label, type: 'number',
        defaultHint: noLimit ? formatRounds(defaultValue) : String(defaultValue),
        presets: noLimit ? [{ value: null, label: 'No limit' }, ...presets] : presets,
        min: 1, max,
    };
    if (noLimit) {
        field.format = formatRounds;
    }
    return field;
}
