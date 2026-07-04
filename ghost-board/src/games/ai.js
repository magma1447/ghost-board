// AI opponent throw engine. For each AI dart the controller asks aiThrow() for
// the { ring, segment } to feed through the normal dart path. v1 handles Around
// the Clock; anything else gets a crude bull fallback. Per-game strategies (and
// a real board-scatter accuracy model) grow from here.

import { BOARD_ORDER } from '../board/segments.js';

// Chance of hitting the intended target this dart, by level (10 = flawless)
// scaled down for harder rings.
function hitChance(level, difficulty) {
    if (level >= 10) {
        return 1;
    }
    let chance = 0.3 + ((level - 1) / 9) * 0.7; // 0.30 (L1) … ~0.92 (L9)
    if (difficulty === 'doubles') {
        chance *= 0.55;
    } else if (difficulty === 'trebles') {
        chance *= 0.45;
    }
    return chance;
}

// A physically adjacent number — a believable near miss.
function neighbourNumber(target) {
    const i = BOARD_ORDER.indexOf(target);
    const step = Math.random() < 0.5 ? -1 : 1;
    return i === -1 ? (target % 20) + 1 : BOARD_ORDER[(i + step + 20) % 20];
}

// Around the Clock: aim the current target with the ring its hit-mode needs;
// land it with the level's chance, otherwise miss to a neighbour.
function throwAroundTheClock(state, level) {
    const player = state.players[state.currentPlayerIndex];
    const target = player.currentTarget;
    const { hitMode, bullFinish } = state.options;

    if (target === 21) { // bull finish
        const difficulty = bullFinish === 'double' ? 'trebles' : 'doubles';
        if (Math.random() < hitChance(level, difficulty)) {
            return bullFinish === 'double'
                ? { ring: 'DBULL', segment: 50 }
                : { ring: 'SBULL', segment: 25 };
        }
        return { ring: 'SO', segment: neighbourNumber(20) };
    }

    if (Math.random() < hitChance(level, hitMode)) {
        const ring = hitMode === 'doubles' ? 'D' : hitMode === 'trebles' ? 'T' : 'SO';
        return { ring, segment: target };
    }
    return { ring: 'SO', segment: neighbourNumber(target) };
}

const STRATEGIES = {
    'around-the-clock': throwAroundTheClock,
};

// The next dart for an AI player mid-turn, given the live game state + level.
export function aiThrow(gameType, state, level) {
    const strategy = STRATEGIES[gameType];
    return strategy ? strategy(state, level) : { ring: 'DBULL', segment: 50 };
}
