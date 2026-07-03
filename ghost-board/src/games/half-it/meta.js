export const meta = {
    short: 'Hit each round\'s target to bank points — miss it with all three darts and your total is halved.',
    players: { min: 1, max: 8 },
    playSkill: 3,
    rulesComplexity: 3,
    tags: ['scoring'],
    scoringStyle: 'Count up',
    options: {
        startScore: 'The total everyone begins with. Usually 0, so scores build up from the first round.',
        onDraw: 'If totals are tied at the end: a draw, or sudden-death bull-off rounds until someone leads.',
    },
};
