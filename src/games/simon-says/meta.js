// Short descriptions for Simon Says. Option keys match the setup panel's
// data-field names. Full rules live in rules.md.

export const meta = {
    short: 'Simon picks three numbers each round — hit them in any order, most points wins.',
    options: {
        hitMode: 'Which ring counts as a hit: any, doubles only, or triples only.',
        scoring: 'Flat scores 1 per hit; staggered scores 1, 2, 3 for the 1st, 2nd, 3rd hit of a turn.',
        maxRounds: 'How many rounds are played, or no limit.',
        onDraw: 'If scores are tied at the end: a draw, or sudden-death rounds until someone leads.',
    },
};
