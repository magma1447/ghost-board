// Cricket option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line (describeSettings).

import { numberSetField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    variant: 'standard',
    numberSet: 'standard',
};

const VARIANT_LABELS = { standard: 'standard', cutthroat: 'cut-throat', simple: 'simple' };

export const fields = [
    {
        name: 'variant', label: 'Scoring', type: 'select',
        defaultHint: VARIANT_LABELS[defaults.variant],
        options: [
            { value: 'standard', label: 'Standard' },
            { value: 'cutthroat', label: 'Cut-throat' },
            { value: 'simple', label: 'Simple (no score)' },
        ],
    },
    numberSetField(defaults.numberSet),
];
