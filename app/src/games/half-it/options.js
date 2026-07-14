// Half It option schema — defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

import { onDrawField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    startScore: 0,
    onDraw: 'draw',
};

export const fields = [
    {
        name: 'startScore', label: 'Starting score', type: 'number',
        defaultHint: '0',
        presets: [0], min: 0, max: 100,
    },
    onDrawField(defaults.onDraw),
];
