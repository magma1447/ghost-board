// All Fives option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';
import { bullModeField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    target: 51,
    allowOvershoot: false,
    bullMode: '25/50',
};

export const fields = [
    {
        name: 'target', label: 'Target', type: 'number',
        defaultHint: String(defaults.target),
        presets: [51], min: 10, max: 200,
    },
    {
        name: 'allowOvershoot', label: 'Allow overshoot', type: 'checkbox',
        defaultHint: formatBool(defaults.allowOvershoot),
    },
    bullModeField(defaults.bullMode),
];
