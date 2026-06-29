// Cat and Mouse game setup panel

import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createCatAndMouseSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Cat and Mouse',
        settingsKey: 'catAndMouse',
        defaults,
        fields,
        meta,
        rulesMd,
        // Cat and Mouse is always exactly 2 players (Mouse vs Cat)
        roster: { min: 2, max: 2 },
        matchLock: { field: 'roundLimitResult', value: 'mouse' },
    });
}
