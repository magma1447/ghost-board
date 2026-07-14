// Scram option schema — defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

import { numberSetField, onDrawField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    numberSet: 'standard',
    onDraw: 'draw',
};

export const fields = [
    numberSetField(defaults.numberSet),
    onDrawField(defaults.onDraw),
];
