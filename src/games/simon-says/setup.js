// Simon Says game setup panel

import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createSimonSaysSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Simon Says',
        settingsKey: 'simonSays',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        matchLock: { field: 'onDraw', value: 'continue' },
    });
}
