// X01 game setup panel

import { createGameSetup } from '../../game-engine/core/setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createX01Setup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'X01',
        settingsKey: 'x01',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        matchLock: { field: 'maxRounds', value: null },
    });
}
