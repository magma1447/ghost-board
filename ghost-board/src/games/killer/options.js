// Killer option schema — defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../format.js';

export const defaults = {
    mode: 'standard',
    numberAssignment: 'throw',
    lives: 3,
    selfKill: true,
    straightOff: false,
};

const MODE_LABELS = {
    standard: 'Standard',
    'double-trouble': 'Double Trouble',
    'treble-trouble': 'Treble Trouble',
};
const ASSIGN_LABELS = { throw: 'Throw for it', random: 'Random' };

export const fields = [
    {
        name: 'mode', label: 'Mode', type: 'select',
        defaultHint: MODE_LABELS[defaults.mode],
        options: [
            { value: 'standard', label: 'Standard' },
            { value: 'double-trouble', label: 'Double Trouble' },
            { value: 'treble-trouble', label: 'Treble Trouble' },
        ],
    },
    {
        name: 'numberAssignment', label: 'Numbers', type: 'select',
        defaultHint: ASSIGN_LABELS[defaults.numberAssignment],
        options: [
            { value: 'throw', label: 'Throw for it' },
            { value: 'random', label: 'Random' },
        ],
    },
    {
        name: 'lives', label: 'Lives', type: 'number',
        defaultHint: String(defaults.lives),
        presets: [3, 4, 5, 7, 10], min: 3, max: 10,
    },
    {
        name: 'selfKill', label: 'Self-kill', type: 'checkbox',
        defaultHint: formatBool(defaults.selfKill),
    },
    {
        name: 'straightOff', label: 'Straight off', type: 'checkbox',
        defaultHint: formatBool(defaults.straightOff),
    },
];
