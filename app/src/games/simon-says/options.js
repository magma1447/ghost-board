// Simon Says option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line
// (describeSettings).

import { hitModeField, maxRoundsField, onDrawField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    hitMode: 'any',
    scoring: 'flat',
    maxRounds: 10,
    onDraw: 'draw',
};

export const fields = [
    hitModeField(defaults.hitMode),
    {
        name: 'scoring', label: 'Scoring', type: 'select',
        defaultHint: defaults.scoring,
        options: [
            { value: 'flat', label: 'Flat (1, 1, 1)' },
            { value: 'staggered', label: 'Staggered (1, 2, 3)' },
        ],
    },
    maxRoundsField(defaults.maxRounds, { presets: [5, 10, 15, 20], max: 100, noLimit: true }),
    onDrawField(defaults.onDraw),
];
