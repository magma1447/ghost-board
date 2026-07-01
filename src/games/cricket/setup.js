// Cricket game setup panel

import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createCricketSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Cricket',
        settingsKey: 'cricket',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        // No matchLock: Cricket always resolves to a winner (no draw option).
    });
}
