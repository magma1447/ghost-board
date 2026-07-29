// Short descriptions for Domination — a one-line synopsis plus one-liners per
// option. The full, formatted rules live in rules.md. Option keys match the
// setup panel's data-field names.

export const meta = {
    short: 'Claim a number, then take over neighbouring numbers to spread across the board — dominate to win.',
    aka: [],
    players: { min: 2, max: 8 },
    playSkill: 3,
    rulesComplexity: 3,
    tags: ['territory', 'tactical'],
    scoringStyle: 'Territory',
    supportsAi: true,
    options: {
        bull: 'When on, the bull is an extra territory connected to every number — hold any number and you can always contest it, hold the bull and you can attack anywhere. It also counts toward the win target.',
        winPercent: 'The share of the board you must hold to win outright, checked after every dart. Lower values make for shorter games; 100% means conquering the whole board.',
        maxRounds: 'If no one reaches the target, whoever holds the most territory when the round limit is reached wins.',
        onDraw: 'What happens if the round limit is reached with a tie for the most territory: call it a draw, or play sudden-death rounds until someone leads.',
        numberAssignment: 'How each player gets their starting number: throw a dart at a free number to claim it, or have distinct numbers dealt at random.',
    },
};
