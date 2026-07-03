export const meta = {
    short: 'Each round targets the next number (1, 2, 3…); singles/doubles/trebles score — highest total wins.',
    players: { min: 1, max: 8 },
    playSkill: 3,
    rulesComplexity: 2,
    tags: ['scoring'],
    scoringStyle: 'Count up',
    options: {
        maxRounds: 'How many rounds — round 1 targets the 1, round 2 the 2, and so on. 7 is the classic short game; 20 is the full game.',
        shanghaiWin: 'Hitting a single, double and treble of the round\'s number in one turn wins instantly, whatever the score.',
        onDraw: 'If totals are tied at the end: a draw, or sudden-death rounds until someone leads.',
    },
};
