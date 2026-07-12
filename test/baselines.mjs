// Level-10 baselines. Level 10 has zero scatter, so with a fixed seed every game
// plays out identically — a perfect-play snapshot we can regression-test.
//
// Two layers:
//   - Known optima: hard assertions where perfect play has a famous/known result
//     (the 9-dart 501, a flawless Bob's 27, …). Falling short is a real bug.
//   - Golden snapshot: the level-10 solo result (darts / winner / scores) for
//     every AI game, stored in baselines.json. Any change fails the run for
//     review — fewer darts / higher score usually means a fix (re-baseline with
//     --update); worse means a regression.
//
// Run:        docker compose -f docker/compose.yaml run --rm toolbox node test/baselines.mjs
// Re-baseline: … node test/baselines.mjs --update

import fs from 'node:fs';
import { GAME_LOGIC } from '../ghost-board/src/game-engine/core/games-logic.js';
import { installSeededRandom } from './seeded-random.mjs';
import { runGame } from './harness.mjs';

const SEED = 42;
const BASELINE_FILE = new URL('./baselines.json', import.meta.url);
const update = process.argv.includes('--update');

// Solo where the game allows it (cleanest deterministic finish), else its minimum.
function seatCount(meta) {
    return meta.players.min <= 1 ? 1 : meta.players.min;
}

// Level-10, default options, fixed seed — for every AI game.
const current = {};
for (const game of GAME_LOGIC) {
    if (!game.aim) {
        continue; // no AI → no deterministic level-10 line
    }
    installSeededRandom(SEED);
    const r = runGame(game, game.defaults, 10, seatCount(game.meta));
    current[game.type] = { players: seatCount(game.meta), darts: r.darts, winner: r.winner, scores: r.scores };
}

const failures = [];

// --- Known optima (perfect play has a known result) ---
const KNOWN = [
    { game: 'x01', want: '9 darts, 0 left — the perfect 501 double-out leg', ok: (r) => r.darts === 9 && r.scores[0] === 0 },
    { game: 'bobs-27', want: 'score 1437 — a flawless card', ok: (r) => r.scores[0] === 1437 },
    { game: 'count-up', want: 'score 1440 in 24 darts — eight treble-20 turns', ok: (r) => r.scores[0] === 1440 && r.darts === 24 },
    { game: 'around-the-clock', want: '21 darts — 1–20 and the bull, one each', ok: (r) => r.darts === 21 },
    { game: 'score-rush', want: '300 in 5 darts — five treble-20s', ok: (r) => r.scores[0] === 300 && r.darts === 5 },
    { game: 'shanghai', want: 'score 252 in 21 darts — a treble every round', ok: (r) => r.scores[0] === 252 && r.darts === 21 },
    { game: 'all-fives', want: 'finish exactly 51 in 5 darts', ok: (r) => r.scores[0] === 51 && r.darts === 5 },
];
for (const k of KNOWN) {
    const r = current[k.game];
    const pass = r && k.ok(r);
    console.log(`optimum  ${k.game.padEnd(18)} ${pass ? 'OK  ' : 'FAIL'} — ${k.want}`);
    if (!pass) {
        failures.push(`OPTIMUM  ${k.game} — expected ${k.want}; got darts=${r?.darts} scores=${JSON.stringify(r?.scores)}`);
    }
}

// --- Golden snapshot compare ---
let baseline = null;
try {
    baseline = JSON.parse(fs.readFileSync(BASELINE_FILE, 'utf8'));
} catch {
    baseline = null; // first run
}

if (update || baseline === null) {
    fs.writeFileSync(BASELINE_FILE, JSON.stringify(current, null, 2) + '\n');
    console.log(`\nBaselines written (${Object.keys(current).length} games) → test/baselines.json`);
} else {
    for (const type of Object.keys(current)) {
        const a = baseline[type];
        const b = current[type];
        if (!a) {
            failures.push(`NEW      ${type} — no baseline yet (run with --update)`);
            continue;
        }
        if (a.darts !== b.darts || a.winner !== b.winner || JSON.stringify(a.scores) !== JSON.stringify(b.scores)) {
            const hint = b.darts < a.darts ? ' (fewer darts — likely a fix, re-baseline with --update)' : '';
            failures.push(`CHANGED  ${type} — was darts=${a.darts} scores=${JSON.stringify(a.scores)}, now darts=${b.darts} scores=${JSON.stringify(b.scores)}${hint}`);
        }
    }
    for (const type of Object.keys(baseline)) {
        if (!current[type]) {
            failures.push(`MISSING  ${type} — in baseline but not produced now`);
        }
    }
}

console.log('');
if (failures.length > 0) {
    console.log(`FAILURES (${failures.length}):`);
    for (const f of failures) {
        console.log('  ' + f);
    }
    process.exit(1);
}
console.log('Baselines + known optima OK.');
