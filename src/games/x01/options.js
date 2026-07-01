// X01 option schema — the defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool, formatRounds } from '../format.js';

export const defaults = {
    startingScore: 501,
    doubleIn: false,
    doubleOut: true,
    bullMode: '25/50',
    maxRounds: 20,
    checkoutThreshold: 170,
};

function formatCheckout(v) {
    return v === 0 ? 'off' : String(v);
}

export const fields = [
    {
        name: 'startingScore', label: 'Start score', type: 'number',
        defaultHint: String(defaults.startingScore),
        presets: [301, 501, 701, 1001], min: 201, max: 3001,
    },
    {
        name: 'doubleIn', label: 'Double in', type: 'checkbox',
        defaultHint: formatBool(defaults.doubleIn),
    },
    {
        name: 'doubleOut', label: 'Double out', type: 'checkbox',
        defaultHint: formatBool(defaults.doubleOut),
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
    {
        name: 'checkoutThreshold', label: 'Checkout calls below', type: 'select', valueType: 'int',
        defaultHint: formatCheckout(defaults.checkoutThreshold),
        options: [
            { value: 0, label: 'Off' },
            { value: 60, label: '60' },
            { value: 130, label: '130' },
            { value: 140, label: '140' },
            { value: 170, label: '170' },
            { value: 180, label: '180' },
        ],
    },
];
