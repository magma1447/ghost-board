// Score Rush game setup panel

import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createScoreRushSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Score Rush',
        settingsKey: 'scoreRush',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        // No matchLock: first-to-target always produces a winner (no draw).
    });
}
