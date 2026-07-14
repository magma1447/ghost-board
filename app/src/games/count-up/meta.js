// Short descriptions for Count Up. Option keys match the setup panel's
// data-field names. Full rules live in rules.md.

export const meta = {
    short: 'Add up your score over a fixed number of rounds — highest total wins.',
    players: { min: 1, max: 8 },
    playSkill: 2,
    rulesComplexity: 2,
    tags: ['scoring', 'beginner'],
    scoringStyle: 'Count up',
    supportsAi: true,
    options: {
        maxRounds: 'How many rounds are played (8 is the standard game).',
        bullMode: 'Bull scoring: 25 outer / 50 inner (standard), or 50 / 50.',
        singlesOnly: 'Count doubles and trebles as their face (single) value — a gentler game. Bull scoring is unchanged.',
        onDraw: 'If totals are tied at the end: a draw, or sudden-death rounds until someone leads.',
    },
};
