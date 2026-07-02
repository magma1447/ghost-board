// Count Up option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../format.js';

export const defaults = {
    maxRounds: 8,
    bullMode: '25/50',
    singlesOnly: false,
    onDraw: 'draw',
};

const ON_DRAW_LABELS = { draw: 'draw', continue: 'play until a winner' };

export const fields = [
    {
        name: 'maxRounds', label: 'Rounds', type: 'number',
        defaultHint: String(defaults.maxRounds),
        presets: [8], min: 1, max: 30,
    },
    {
        name: 'bullMode', label: 'Bull scoring', type: 'select',
        defaultHint: defaults.bullMode,
        options: [
            { value: '25/50', label: '25 / 50 (standard)' },
            { value: '50/50', label: '50 / 50' },
        ],
    },
    {
        name: 'singlesOnly', label: 'Singles only', type: 'checkbox',
        defaultHint: formatBool(defaults.singlesOnly),
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
