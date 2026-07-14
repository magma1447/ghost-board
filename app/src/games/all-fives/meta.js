// Short descriptions for All Fives. Option keys match the setup panel's
// data-field names. Full rules live in rules.md.

export const meta = {
    short: 'Each turn must total a multiple of 5 — you score the total ÷ 5. First to the target wins.',
    aka: ['51 by 5s', 'Fives', 'Fifty-One by Fives'],
    players: { min: 1, max: 8 },
    playSkill: 3,
    rulesComplexity: 1,
    tags: ['scoring'],
    scoringStyle: 'Count up',
    supportsAi: true,
    options: {
        target: 'The score to reach. By default you must land on it exactly.',
        allowOvershoot: 'Reach or pass the target to win, instead of finishing exactly on it.',
        bullMode: 'Bull scoring: 25 outer / 50 inner (standard), or 50 / 50.',
    },
};
