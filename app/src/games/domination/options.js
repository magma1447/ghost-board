// Domination option schema — defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';
import { maxRoundsField, onDrawField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    bull: true,
    winPercent: 100,
    maxRounds: 20,
    onDraw: 'draw',
    numberAssignment: 'throw',
};

const ASSIGN_LABELS = { throw: 'Throw for it', random: 'Random' };
const formatPercent = (value) => `${value}%`;

export const fields = [
    {
        name: 'bull', label: 'Bull', type: 'checkbox',
        defaultHint: formatBool(defaults.bull),
    },
    {
        name: 'winPercent', label: 'Domination to win', type: 'number',
        defaultHint: formatPercent(defaults.winPercent),
        presets: [
            { value: 50, label: '50%' },
            { value: 60, label: '60%' },
            { value: 75, label: '75%' },
            { value: 100, label: '100%' },
        ],
        min: 25, max: 100, format: formatPercent,
    },
    maxRoundsField(defaults.maxRounds, { presets: [10, 15, 20, 30], max: 100, noLimit: true }),
    onDrawField(defaults.onDraw),
    {
        name: 'numberAssignment', label: 'Starting numbers', type: 'select',
        defaultHint: ASSIGN_LABELS[defaults.numberAssignment],
        options: [
            { value: 'throw', label: 'Throw for it' },
            { value: 'random', label: 'Random' },
        ],
    },
];
