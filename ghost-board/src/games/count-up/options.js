// Count Up option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';
import { bullModeField, maxRoundsField, onDrawField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    maxRounds: 8,
    bullMode: '25/50',
    singlesOnly: false,
    onDraw: 'draw',
};

export const fields = [
    maxRoundsField(defaults.maxRounds, { presets: [8], max: 30 }),
    bullModeField(defaults.bullMode),
    {
        name: 'singlesOnly', label: 'Singles only', type: 'checkbox',
        defaultHint: formatBool(defaults.singlesOnly),
    },
    onDrawField(defaults.onDraw),
];
