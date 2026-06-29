// X01 game setup panel

import { formatBool, formatRounds } from '../format.js';
import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';

const D = {
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

export function createX01Setup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'X01 Game',
        settingsKey: 'x01',
        defaults: D,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        fields: [
            {
                name: 'startingScore', label: 'Start score', type: 'select', valueType: 'int',
                defaultHint: String(D.startingScore),
                options: [301, 501, 701, 1001].map((v) => ({ value: v, label: String(v) })),
            },
            {
                name: 'doubleIn', label: 'Double in', type: 'checkbox',
                defaultHint: formatBool(D.doubleIn),
            },
            {
                name: 'doubleOut', label: 'Double out', type: 'checkbox',
                defaultHint: formatBool(D.doubleOut),
            },
            {
                name: 'bullMode', label: 'Bull scoring', type: 'select',
                defaultHint: D.bullMode,
                options: [
                    { value: '25/50', label: '25 / 50 (standard)' },
                    { value: '50/50', label: '50 / 50' },
                ],
            },
            {
                name: 'maxRounds', label: 'Max rounds', type: 'select', valueType: 'int',
                defaultHint: formatRounds(D.maxRounds),
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
                defaultHint: formatCheckout(D.checkoutThreshold),
                options: [
                    { value: 0, label: 'Off' },
                    { value: 60, label: '60' },
                    { value: 130, label: '130' },
                    { value: 140, label: '140' },
                    { value: 170, label: '170' },
                    { value: 180, label: '180' },
                ],
            },
        ],
    });
}
