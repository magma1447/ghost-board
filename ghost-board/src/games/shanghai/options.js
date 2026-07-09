// Shanghai option schema — defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';

export const defaults = {
    maxRounds: 7,
    shanghaiWin: true,
    onDraw: 'draw',
};

const ON_DRAW_LABELS = { draw: 'draw', continue: 'play until a winner' };

export const fields = [
    {
        name: 'maxRounds', label: 'Rounds', type: 'number',
        defaultHint: String(defaults.maxRounds),
        presets: [7, 20], min: 1, max: 20,
    },
    {
        name: 'shanghaiWin', label: 'Shanghai instant win', type: 'checkbox',
        defaultHint: formatBool(defaults.shanghaiWin),
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
