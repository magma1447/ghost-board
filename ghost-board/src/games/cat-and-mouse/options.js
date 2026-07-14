// Cat and Mouse option schema — the defaults and field definitions, shared by
// the setup panel (createGameSetup) and the in-game settings line
// (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';
import { hitModeField, maxRoundsField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    gap: 1,
    hitMode: 'any',
    multiStep: false,
    sprint: false,
    maxRounds: null,
    roundLimitResult: 'mouse',
};

const ROUND_LIMIT_LABELS = { mouse: 'mouse wins', draw: 'draw' };

export const fields = [
    {
        name: 'gap', label: 'Head start', type: 'number',
        defaultHint: String(defaults.gap),
        presets: [1, 2, 3, 4, 5], min: 1, max: 19,
    },
    hitModeField(defaults.hitMode),
    {
        name: 'multiStep', label: 'Multi-step', type: 'checkbox',
        defaultHint: formatBool(defaults.multiStep),
    },
    {
        name: 'sprint', label: 'Sprint', type: 'checkbox',
        defaultHint: formatBool(defaults.sprint),
    },
    maxRoundsField(defaults.maxRounds, { label: 'Max rounds', presets: [10, 15, 20, 30], max: 100, noLimit: true }),
    {
        name: 'roundLimitResult', label: 'Round limit result', type: 'select',
        defaultHint: ROUND_LIMIT_LABELS[defaults.roundLimitResult],
        options: [
            { value: 'mouse', label: 'Mouse wins' },
            { value: 'draw', label: 'Draw' },
        ],
    },
];
