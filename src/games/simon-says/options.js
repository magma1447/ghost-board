// Simon Says option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line
// (describeSettings).

import { formatRounds } from '../format.js';

export const defaults = {
    hitMode: 'any',
    scoring: 'flat',
    maxRounds: 10,
    onDraw: 'draw',
};

const ON_DRAW_LABELS = { draw: 'draw', continue: 'play until a winner' };

export const fields = [
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
        name: 'scoring', label: 'Scoring', type: 'select',
        defaultHint: defaults.scoring,
        options: [
            { value: 'flat', label: 'Flat (1, 1, 1)' },
            { value: 'staggered', label: 'Staggered (1, 2, 3)' },
        ],
    },
    {
        name: 'maxRounds', label: 'Rounds', type: 'number',
        defaultHint: formatRounds(defaults.maxRounds),
        presets: [{ value: null, label: 'No limit' }, 5, 10, 15, 20],
        min: 1, max: 100, format: formatRounds,
    },
    {
        name: 'onDraw', label: 'On a tie', type: 'select',
        defaultHint: ON_DRAW_LABELS[defaults.onDraw],
        options: [
            { value: 'draw', label: 'Draw' },
            { value: 'continue', label: 'Play until a winner' },
        ],
    },
];
