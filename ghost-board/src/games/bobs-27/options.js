// Bob's 27 option schema — defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

import { formatBool } from '../../game-engine/shared/format.js';
import { onDrawField } from '../../game-engine/shared/option-fields.js';

export const defaults = {
    elimination: true,
    bullMode: 'double',
    onDraw: 'draw',
};

const BULL_LABELS = { double: 'double bull (50)', any: 'any bull' };

export const fields = [
    {
        name: 'elimination', label: 'Elimination', type: 'checkbox',
        defaultHint: formatBool(defaults.elimination),
    },
    {
        name: 'bullMode', label: 'Final bull', type: 'select',
        defaultHint: BULL_LABELS[defaults.bullMode],
        options: [
            { value: 'double', label: 'Double bull only (50)' },
            { value: 'any', label: 'Any bull (25 or 50)' },
        ],
    },
    onDrawField(defaults.onDraw),
];
