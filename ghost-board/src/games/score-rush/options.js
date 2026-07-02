// Score Rush option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../format.js';

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
];
