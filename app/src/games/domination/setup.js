import { createGameSetup } from '../../game-engine/core/setup-factory.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { defaults, fields } from './options.js';

export function createDominationSetup(container, onStart, onCancel) {
    return createGameSetup(container, onStart, onCancel, {
        title: 'Domination',
        settingsKey: 'domination',
        defaults,
        fields,
        meta,
        rulesMd,
        roster: { min: 2, max: 8 },
    });
}
