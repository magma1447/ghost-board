export const meta = {
    short: 'Start on 27 points and work the doubles D1–D20 then the bull — hit to score, miss all three and lose that double\'s value.',
    players: { min: 1, max: 8 },
    playSkill: 5,
    rulesComplexity: 2,
    tags: ['doubles', 'practice'],
    scoringStyle: 'Count up',
    options: {
        elimination: 'When on, dropping to 0 or below knocks you out for the rest of the game — last player standing wins. Off, scores can go negative and everyone plays the whole card.',
        bullMode: 'The final bull: the double bull (50) only — the authentic, hard finish — or any bull, which lets the outer 25 count and softens the miss to −25.',
        onDraw: 'If totals are tied at the end: a draw, or sudden-death double-bull rounds until someone leads.',
    },
};
