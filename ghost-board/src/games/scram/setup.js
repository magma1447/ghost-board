import { createGameSetup } from '../setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createScramSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Scram',
        settingsKey: 'scram',
        defaults,
        fields,
        meta,
        rulesMd,
        // Scram is always exactly 2 players (stopper vs scorer).
        roster: { min: 2, max: 2 },
        // A leg must have a winner, so match play forces sudden-death on a tie.
        matchLock: { field: 'onDraw', value: 'continue' },
    });
}
