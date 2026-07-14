// All Fives game setup panel

import { createGameSetup } from '../../game-engine/core/setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createAllFivesSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'All Fives',
        settingsKey: 'allFives',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
    });
}
