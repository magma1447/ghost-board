// Simon Says game setup panel

import { formatRounds } from '../format.js';
import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';

const D = {
    hitMode: 'any',
    scoring: 'flat',
    maxRounds: 10,
    onDraw: 'draw',
};

const ON_DRAW_LABELS = { draw: 'draw', continue: 'play until a winner' };

export function createSimonSaysSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Simon Says',
        settingsKey: 'simonSays',
        defaults: D,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        matchLock: { field: 'onDraw', value: 'continue' },
        fields: [
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
                name: 'scoring', label: 'Scoring', type: 'select',
                defaultHint: D.scoring,
                options: [
                    { value: 'flat', label: 'Flat (1, 1, 1)' },
                    { value: 'staggered', label: 'Staggered (1, 2, 3)' },
                ],
            },
            {
                name: 'maxRounds', label: 'Rounds', type: 'select', valueType: 'int',
                defaultHint: formatRounds(D.maxRounds),
                options: [
                    { value: 0, label: 'No limit' },
                    { value: 5, label: '5' },
                    { value: 10, label: '10' },
                    { value: 15, label: '15' },
                    { value: 20, label: '20' },
                ],
            },
            {
                name: 'onDraw', label: 'On a tie', type: 'select',
                defaultHint: ON_DRAW_LABELS[D.onDraw],
                options: [
                    { value: 'draw', label: 'Draw' },
                    { value: 'continue', label: 'Play until a winner' },
                ],
            },
        ],
    });
}
