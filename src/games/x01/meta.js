// Short descriptions for X01 — a one-line synopsis plus one-liners per option.
// The full, formatted rules live in rules.md. Option keys match the
// setup panel's data-field names.

export const meta = {
    short: 'Count down from a starting score to exactly zero — first to finish wins.',
    aka: ['01', '301', '501', '701', '1001'],
    options: {
        startingScore: 'The score each player counts down from.',
        doubleIn: 'Darts only start counting after you hit a double.',
        doubleOut: 'The winning dart must land in a double (or the bull).',
        bullMode: 'Whether the outer bull scores 25 or 50.',
        maxRounds: 'End in a draw if no one finishes within this many rounds.',
        checkoutThreshold: 'Announce checkout darts once the score drops to this or below.',
    },
};
