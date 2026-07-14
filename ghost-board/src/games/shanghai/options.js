// Shanghai option schema — defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';
import { maxRoundsField, onDrawField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    maxRounds: 7,
    shanghaiWin: true,
    onDraw: 'draw',
};

export const fields = [
    maxRoundsField(defaults.maxRounds, { presets: [7, 20], max: 20 }),
    {
        name: 'shanghaiWin', label: 'Shanghai instant win', type: 'checkbox',
        defaultHint: formatBool(defaults.shanghaiWin),
    },
    onDrawField(defaults.onDraw),
];
