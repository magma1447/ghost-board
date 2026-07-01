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
    return v === null ? 'off' : String(v);
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
        name: 'maxRounds', label: 'Max rounds', type: 'number',
        defaultHint: formatRounds(defaults.maxRounds),
        presets: [{ value: null, label: 'No limit' }, 15, 20, 25, 30],
        min: 1, max: 100, format: formatRounds,
    },
    {
        name: 'checkoutThreshold', label: 'Checkout calls below', type: 'number',
        defaultHint: formatCheckout(defaults.checkoutThreshold),
        presets: [{ value: null, label: 'Off' }, 60, 130, 140, 170, 180],
        min: 20, max: 180, format: formatCheckout,
    },
];
