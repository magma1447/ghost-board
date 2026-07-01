// Cat and Mouse option schema — the defaults and field definitions, shared by
// the setup panel (createGameSetup) and the in-game settings line
// (describeSettings).

import { formatBool, formatRounds } from '../format.js';

export const defaults = {
    gap: 1,
    hitMode: 'any',
    multiStep: false,
    sprint: false,
    maxRounds: null,
    roundLimitResult: 'mouse',
};

const ROUND_LIMIT_LABELS = { mouse: 'mouse wins', draw: 'draw' };

export const fields = [
    {
        name: 'gap', label: 'Head start', type: 'number',
        defaultHint: String(defaults.gap),
        presets: [1, 2, 3, 4, 5], min: 1, max: 19,
    },
    {
        name: 'hitMode', label: 'Hit mode', type: 'select',
        defaultHint: defaults.hitMode,
        options: [
            { value: 'any', label: 'Any' },
            { value: 'doubles', label: 'Doubles only' },
            { value: 'triples', label: 'Triples only' },
        ],
    },
    {
        name: 'multiStep', label: 'Multi-step', type: 'checkbox',
        defaultHint: formatBool(defaults.multiStep),
    },
    {
        name: 'sprint', label: 'Sprint', type: 'checkbox',
        defaultHint: formatBool(defaults.sprint),
    },
    {
        name: 'maxRounds', label: 'Max rounds', type: 'number',
        defaultHint: formatRounds(defaults.maxRounds),
        presets: [{ value: null, label: 'No limit' }, 10, 15, 20, 30],
        min: 1, max: 100, format: formatRounds,
    },
    {
        name: 'roundLimitResult', label: 'Round limit result', type: 'select',
        defaultHint: ROUND_LIMIT_LABELS[defaults.roundLimitResult],
        options: [
            { value: 'mouse', label: 'Mouse wins' },
            { value: 'draw', label: 'Draw' },
        ],
    },
];
