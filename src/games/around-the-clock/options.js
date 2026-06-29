// Around the Clock option schema — the defaults and field definitions, shared
// by the setup panel (createGameSetup) and the in-game settings line
// (describeSettings).

import { formatBool, formatRounds } from '../format.js';

export const defaults = {
    bullFinish: 'single',
    hitMode: 'any',
    multiStep: false,
    maxRounds: 0,
};

const BULL_LABELS = { off: 'off', single: 'single bull', double: 'double bull' };

const HIT_MODE_OPTIONS = [
    { value: 'any', label: 'Any' },
    { value: 'doubles', label: 'Doubles only' },
    { value: 'triples', label: 'Triples only' },
];

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
    {
        name: 'hitMode', label: 'Hit mode', type: 'select',
        defaultHint: defaults.hitMode,
        options: HIT_MODE_OPTIONS,
    },
    {
        name: 'multiStep', label: 'Multi-step', type: 'checkbox',
        defaultHint: formatBool(defaults.multiStep),
    },
    {
        name: 'maxRounds', label: 'Max rounds', type: 'select', valueType: 'int',
        defaultHint: formatRounds(defaults.maxRounds),
        options: [
            { value: 0, label: 'No limit' },
            { value: 15, label: '15' },
            { value: 20, label: '20' },
            { value: 25, label: '25' },
            { value: 30, label: '30' },
        ],
    },
];
