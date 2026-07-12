// Shared test harness: play a full game headless, all seats driven by the AI
// (or random darts when a game has no AI), plus a setting-combination generator.

import { applyScatter, AI_PROFILES } from '../ghost-board/src/ai/scatter.js';

const RINGS = ['SO', 'SI', 'D', 'T'];

// A random dart, for driving games with no AI aim (Cricket, Scram, Killer) —
// enough to shake out crashes / stuck states, not a skilled opponent.
function randomDart() {
    const r = Math.random();
    if (r < 0.03) {
        return { ring: 'DBULL', segment: 50 };
    }
    if (r < 0.06) {
        return { ring: 'SBULL', segment: 25 };
    }
    return { ring: RINGS[Math.floor(Math.random() * 4)], segment: 1 + Math.floor(Math.random() * 20) };
}

// A sensible seat count for a game (2, or the game's minimum if higher).
export function playerCount(meta) {
    return Math.min(Math.max(2, meta.players.min), meta.players.max);
}

// Every setting combination: discrete options (select / checkbox) enumerated in
// full, numeric options sampled at min / default / max.
export function optionCombos(fields, defaults) {
    const perField = fields.map((f) => {
        if (f.type === 'checkbox') {
            return [{ [f.name]: false }, { [f.name]: true }];
        }
        if (f.type === 'select') {
            return f.options.map((o) => ({ [f.name]: f.valueType === 'int' ? parseInt(o.value, 10) : o.value }));
        }
        if (f.type === 'number') {
            const values = [...new Set([f.min, defaults[f.name], f.max])];
            return values.map((v) => ({ [f.name]: v }));
        }
        return [{}];
    });
    return perField.reduce(
        (acc, opts) => acc.flatMap((a) => opts.map((o) => ({ ...a, ...o }))),
        [{}],
    );
}

// Play a game to completion. Returns how it ended plus a `timedOut` flag (a
// runaway loop). `level` picks the AI profile; ignored for random-dart games.
export function runGame(gameLogic, options, level, maxDarts = 200000) {
    const n = playerCount(gameLogic.meta);
    const playerUuids = Array.from({ length: n }, (unused, i) => `p${i}`);
    const game = gameLogic.createGame({ numPlayers: n, playerUuids, startingPlayerIndex: 0, ...options });
    const profile = AI_PROFILES[level];

    let darts = 0;
    let iterations = 0;
    const maxIterations = maxDarts * 2 + 10000; // also bounds a switch-only stall
    while (!game.getState().isGameOver && iterations < maxIterations) {
        iterations++;
        const state = game.getState();
        if (state.turn.locked || state.turn.darts.length >= state.dartsPerTurn) {
            game.nextPlayer();
            continue;
        }
        const hit = gameLogic.aim
            ? applyScatter(gameLogic.aim(state, profile), profile)
            : randomDart();
        game.onDart(hit.ring, hit.segment);
        darts++;
    }

    const state = game.getState();
    return { timedOut: iterations >= maxIterations, darts, winner: state.winner, isGameOver: state.isGameOver };
}
