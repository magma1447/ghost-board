// Around the Clock game setup panel

import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createAroundTheClockSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Around the Clock',
        settingsKey: 'aroundTheClock',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        matchLock: { field: 'maxRounds', value: null },
    });
}
