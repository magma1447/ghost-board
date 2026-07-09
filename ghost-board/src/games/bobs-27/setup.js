import { createGameSetup } from '../../game-engine/core/setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createBobs27Setup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: "Bob's 27",
        settingsKey: 'bobs27',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 1, max: 8 },
        // A leg must have a winner, so match play forces sudden-death on a tie.
        matchLock: { field: 'onDraw', value: 'continue' },
    });
}
