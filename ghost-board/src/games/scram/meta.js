export const meta = {
    short: 'Two halves, swapping roles: one player closes every number while the other scores on the open ones — most points wins.',
    players: { min: 2, max: 2 },
    playSkill: 4,
    rulesComplexity: 3,
    tags: ['tactical', 'asymmetric'],
    scoringStyle: 'Marks',
    supportsAi: false,
    options: {
        numberSet: 'Which numbers are in play: the classic 15–20 + bull, a bull-free 14–20, or a random set (with or without the bull) for a fresh board each game.',
        onDraw: 'If both halves leave the scores level: a draw, or sudden death — another pair of halves on 3 random numbers from the set (a fresh 3 each time) until someone leads.',
    },
};
