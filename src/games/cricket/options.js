// Cricket option schema — the defaults and field definitions, shared by the
// setup panel (createGameSetup) and the in-game settings line (describeSettings).

export const defaults = {
    variant: 'standard',
    numberSet: 'standard',
};

const VARIANT_LABELS = { standard: 'standard', cutthroat: 'cut-throat', simple: 'simple' };
const NUMBER_LABELS = { standard: '15–20 + bull', random: 'random' };

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
    {
        name: 'numberSet', label: 'Numbers', type: 'select',
        defaultHint: NUMBER_LABELS[defaults.numberSet],
        options: [
            { value: 'standard', label: '15–20 + bull' },
            { value: 'random', label: 'Random' },
        ],
    },
];
