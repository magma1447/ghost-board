// Short descriptions for Killer — a one-line synopsis plus one-liners per
// option. The full, formatted rules live in rules.md. Option keys match the
// setup panel's data-field names.

export const meta = {
    short: 'Claim a number, become a killer, then knock the lives off your opponents — last player standing wins.',
    aka: ['Killers', 'Double Trouble'],
    players: { min: 2, max: 8 },
    playSkill: 3,
    rulesComplexity: 3,
    tags: ['elimination', 'tactical'],
    scoringStyle: 'Elimination',
    options: {
        mode: 'How you arm and how you kill.\n\nStandard: Hit your own number with any dart to build lives up to the cap and become a killer; then a single / double / treble on an opponent\'s number takes 1 / 2 / 3 of their lives.\n\nDouble Trouble: Only doubles count — your double arms you, an opponent\'s double costs them one life.\n\nTreble Trouble: The same, but on trebles.',
        numberAssignment: 'How each player gets their number: throw a dart at a free number to claim it, or have distinct numbers dealt at random.',
        lives: 'How many lives each player defends. In Standard it\'s also the cap you build up to — reach it and you become a killer.',
        selfKill: 'When on, once you\'re a killer, hitting your own number costs you a life (you can even knock yourself out). When off, your own number is always safe.',
        straightOff: 'When on, everyone starts already a killer — the arming phase is skipped and you can take lives from the very first dart.',
    },
};
