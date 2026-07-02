// Short descriptions for Simon Says. Option keys match the setup panel's
// data-field names. Full rules live in rules.md.

export const meta = {
    short: 'Simon picks three numbers each round — hit them in any order, most points wins.',
    options: {
        hitMode: 'Which ring counts as a hit: any, doubles only, or triples only.',
        scoring: 'Flat: 1 point per hit.\n\nStaggered: 1, 2, then 3 points for the first, second, and third hit of a turn.',
        maxRounds: 'How many rounds are played, or no limit.',
        onDraw: 'If scores are tied at the end: a draw, or sudden-death rounds until someone leads.',
    },
};
