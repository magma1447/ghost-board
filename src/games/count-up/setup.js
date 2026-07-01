// Count Up game setup panel

import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createCountUpSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Count Up',
        settingsKey: 'countUp',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        // A leg must have a winner, so match play forces sudden-death on a tie.
        matchLock: { field: 'onDraw', value: 'continue' },
    });
}
