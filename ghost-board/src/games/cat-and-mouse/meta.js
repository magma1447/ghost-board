// Short descriptions for Cat and Mouse. Option keys match the setup panel's
// data-field names. Full rules live in rules.md.

export const meta = {
    short: 'The mouse races around the board while the cat chases — escape the lap or get caught.',
    options: {
        gap: 'How many steps behind the mouse the cat starts.',
        hitMode: 'Which ring counts as a hit: any, doubles only, or triples only.',
        multiStep: 'A double advances two steps and a triple advances three.',
        sprint: 'A perfect turn (all three darts hit) immediately earns another three darts.',
        maxRounds: 'An optional round limit.',
        roundLimitResult: 'If the limit is reached uncaught: the mouse escapes and wins, or call it a draw.',
    },
};
