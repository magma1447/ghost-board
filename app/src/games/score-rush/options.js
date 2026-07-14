// Score Rush option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';
import { bullModeField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    targetScore: 300,
    bullMode: '25/50',
    singlesOnly: false,
};

export const fields = [
    {
        name: 'targetScore', label: 'Target', type: 'number',
        defaultHint: String(defaults.targetScore),
        presets: [300], min: 100, max: 10000,
    },
    bullModeField(defaults.bullMode),
    {
        name: 'singlesOnly', label: 'Singles only', type: 'checkbox',
        defaultHint: formatBool(defaults.singlesOnly),
    },
];
