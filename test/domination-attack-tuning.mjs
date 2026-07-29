// Self-play tuner for the Domination AI's attack threshold (ATTACK_THRESHOLD in
// src/games/domination/ai.js) — NOT a pass/fail test; a manual analysis tool.
//
// Three players all throw at the same level, differing only in judgement: one
// always attacks an enemy number when it can, one always grows into a free cell,
// and one attacks only when its one-dart capture odds clear a threshold T. They
// play full 3-player games to a real winner, across all six seat orders so
// position bias cancels; we report each policy's win % as T sweeps. The threshold
// that wins the most is the tuned value.
//
// Run (coarse):  docker compose -f docker/compose.yaml run --rm toolbox node test/domination-attack-tuning.mjs
// Run (custom):  … node test/domination-attack-tuning.mjs 0.3 0.4 0.5   (grid of T values)

import { createDomination } from '../app/src/games/domination/game.js';
import { dominationAim } from '../app/src/games/domination/ai.js';
import { applyScatter, AI_PROFILES } from '../app/src/ai/scatter.js';
import { installSeededRandom } from './seeded-random.mjs';

const profile = AI_PROFILES[5]; // all three throw at L5 — only judgement differs

function playGame(policies, seed) {
    installSeededRandom(seed);
    const game = createDomination({ numPlayers: 3, playerUuids: ['p0', 'p1', 'p2'], startingPlayerIndex: 0, bull: false });
    let iters = 0;
    while (!game.getState().isGameOver && iters < 200000) {
        iters++;
        const s = game.getState();
        if (s.turn.locked || s.turn.darts.length >= s.dartsPerTurn) {
            game.nextPlayer();
            continue;
        }
        const idx = s.phase === 'assign' ? s.assignIndex : s.currentPlayerIndex;
        const hit = applyScatter(dominationAim(s, profile, { attackPolicy: policies[idx] }), profile);
        game.onDart(hit.ring, hit.segment);
    }
    return game.getState().winner;
}

function permutations(arr) {
    if (arr.length <= 1) {
        return [arr];
    }
    const res = [];
    arr.forEach((x, i) => {
        for (const p of permutations([...arr.slice(0, i), ...arr.slice(i + 1)])) {
            res.push([x, ...p]);
        }
    });
    return res;
}

// 3-way tournament {attack, neutral, threshold-T}; win % of each, seat bias cancelled.
function tournament(T, gamesPerPerm, seed0) {
    const set = ['attack', 'neutral', T];
    const wins = new Map(set.map((p) => [p, 0]));
    let total = 0;
    let draws = 0;
    let seed = seed0;
    for (const perm of permutations(set)) {
        for (let g = 0; g < gamesPerPerm; g++) {
            const w = playGame(perm, seed++);
            total++;
            if (w === null || w === undefined) {
                draws++;
            } else {
                wins.set(perm[w], wins.get(perm[w]) + 1);
            }
        }
    }
    const decided = total - draws || 1;
    return {
        threshold: 100 * wins.get(T) / decided,
        attack: 100 * wins.get('attack') / decided,
        neutral: 100 * wins.get('neutral') / decided,
        draws,
    };
}

const grid = process.argv.slice(2).map(Number);
const thresholds = grid.length ? grid : [0.1, 0.3, 0.5, 0.7, 0.9];
const perPerm = grid.length ? 400 : 250;
console.log(`3-way self-play, all L5, bull off. threshold player's win % vs the attack & neutral extremes (${6 * perPerm} games each):`);
for (const T of thresholds) {
    const r = tournament(T, perPerm, 1000 + Math.round(T * 100) * 100000);
    console.log(`  T=${T.toFixed(2)}: threshold ${r.threshold.toFixed(1)}%   (attack ${r.attack.toFixed(1)}%  neutral ${r.neutral.toFixed(1)}%)  ${r.draws} draws`);
}
