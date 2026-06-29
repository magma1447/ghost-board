// Cat and Mouse option schema — the defaults and field definitions, shared by
// the setup panel (createGameSetup) and the in-game settings line
// (describeSettings).

import { formatBool, formatRounds } from '../format.js';

export const defaults = {
    gap: 1,
    hitMode: 'any',
    multiStep: false,
    sprint: false,
    maxRounds: 0,
    roundLimitResult: 'mouse',
};

const ROUND_LIMIT_LABELS = { mouse: 'mouse wins', draw: 'draw' };

export const fields = [
    {
        name: 'gap', label: 'Head start', type: 'select', valueType: 'int',
        defaultHint: String(defaults.gap),
        options: [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) })),
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
        name: 'maxRounds', label: 'Max rounds', type: 'select', valueType: 'int',
        defaultHint: formatRounds(defaults.maxRounds),
        options: [
            { value: 0, label: 'No limit' },
            { value: 10, label: '10' },
            { value: 15, label: '15' },
            { value: 20, label: '20' },
            { value: 30, label: '30' },
        ],
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
