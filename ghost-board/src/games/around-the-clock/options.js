// Around the Clock option schema — the defaults and field definitions, shared
// by the setup panel (createGameSetup) and the in-game settings line
// (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';
import { hitModeField, maxRoundsField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    bullFinish: 'single',
    hitMode: 'any',
    multiStep: false,
    maxRounds: null,
};

const BULL_LABELS = { off: 'off', single: 'single bull', double: 'double bull' };

export const fields = [
    {
        name: 'bullFinish', label: 'Bull finish', type: 'select',
        defaultHint: BULL_LABELS[defaults.bullFinish],
        options: [
            { value: 'off', label: 'Off' },
            { value: 'single', label: 'Single bull' },
            { value: 'double', label: 'Double bull' },
        ],
    },
    hitModeField(defaults.hitMode),
    {
        name: 'multiStep', label: 'Multi-step', type: 'checkbox',
        defaultHint: formatBool(defaults.multiStep),
    },
    maxRoundsField(defaults.maxRounds, { label: 'Max rounds', presets: [15, 20, 25, 30], max: 100, noLimit: true }),
];
