// Cat and Mouse game setup panel

import { formatBool, formatRounds } from '../format.js';
import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';

const D = {
    gap: 1,
    hitMode: 'any',
    multiStep: false,
    sprint: false,
    maxRounds: 0,
    roundLimitResult: 'mouse',
};

const ROUND_LIMIT_LABELS = { mouse: 'mouse wins', draw: 'draw' };

export function createCatAndMouseSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Cat and Mouse',
        settingsKey: 'catAndMouse',
        defaults: D,
        meta,
        rulesMd,
        // Cat and Mouse is always exactly 2 players (Mouse vs Cat)
        roster: { min: 2, max: 2 },
        fields: [
            {
                name: 'gap', label: 'Head start', type: 'select', valueType: 'int',
                defaultHint: String(D.gap),
                options: [1, 2, 3, 4, 5].map((v) => ({ value: v, label: String(v) })),
            },
            {
                name: 'hitMode', label: 'Hit mode', type: 'select',
                defaultHint: D.hitMode,
                options: [
                    { value: 'any', label: 'Any' },
                    { value: 'doubles', label: 'Doubles only' },
                    { value: 'triples', label: 'Triples only' },
                ],
            },
            {
                name: 'multiStep', label: 'Multi-step', type: 'checkbox',
                defaultHint: formatBool(D.multiStep),
            },
            {
                name: 'sprint', label: 'Sprint', type: 'checkbox',
                defaultHint: formatBool(D.sprint),
            },
            {
                name: 'maxRounds', label: 'Max rounds', type: 'select', valueType: 'int',
                defaultHint: formatRounds(D.maxRounds),
                options: [
                    { value: 0, label: 'No limit' },
                    { value: 10, label: '10' },
                    { value: 15, label: '15' },
                    { value: 20, label: '20' },
                    { value: 30, label: '30' },
                ],
            },
            {
                name: 'roundLimitResult', label: 'Round limit result', type: 'select',
                defaultHint: ROUND_LIMIT_LABELS[D.roundLimitResult],
                options: [
                    { value: 'mouse', label: 'Mouse wins' },
                    { value: 'draw', label: 'Draw' },
                ],
            },
        ],
    });
}
