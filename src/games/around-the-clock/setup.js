// Around the Clock game setup panel

import { formatBool, formatRounds } from '../format.js';
import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';

const D = {
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

export function createAroundTheClockSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Around the Clock',
        settingsKey: 'aroundTheClock',
        defaults: D,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        matchLock: { field: 'maxRounds', value: 0 },
        fields: [
            {
                name: 'bullFinish', label: 'Bull finish', type: 'select',
                defaultHint: BULL_LABELS[D.bullFinish],
                options: [
                    { value: 'off', label: 'Off' },
                    { value: 'single', label: 'Single bull' },
                    { value: 'double', label: 'Double bull' },
                ],
            },
            {
                name: 'hitMode', label: 'Hit mode', type: 'select',
                defaultHint: D.hitMode,
                options: HIT_MODE_OPTIONS,
            },
            {
                name: 'multiStep', label: 'Multi-step', type: 'checkbox',
                defaultHint: formatBool(D.multiStep),
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
        ],
    });
}
