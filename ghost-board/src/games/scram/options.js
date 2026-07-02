// Scram option schema — defaults and field definitions, shared by the setup
// panel (createGameSetup) and the in-game settings line (describeSettings).

export const defaults = {
    numberSet: 'standard',
    onDraw: 'draw',
};

const NUMBER_LABELS = { standard: '15–20 + bull', fixed14: '14–20 (no bull)', randomBull: 'random w/ bull', randomNoBull: 'random w/o bull' };
const ON_DRAW_LABELS = { draw: 'draw', continue: 'play until a winner' };

export const fields = [
    {
        name: 'numberSet', label: 'Numbers', type: 'select',
        defaultHint: NUMBER_LABELS[defaults.numberSet],
        options: [
            { value: 'standard', label: '15–20 + bull' },
            { value: 'fixed14', label: '14–20 (no bull)' },
            { value: 'randomBull', label: 'Random w/ bull' },
            { value: 'randomNoBull', label: 'Random w/o bull' },
        ],
    },
    {
        name: 'onDraw', label: 'On a tie', type: 'select',
        defaultHint: ON_DRAW_LABELS[defaults.onDraw],
        options: [
            { value: 'draw', label: 'Draw' },
            { value: 'continue', label: 'Play until a winner' },
        ],
    },
];
