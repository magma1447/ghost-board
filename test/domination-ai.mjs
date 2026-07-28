// Domination AI strategy regression tests.
//
// Each check encodes a strategic decision we deliberately made (and confirmed by
// play-testing). It runs the aim function over a fixed board scenario many times
// and asserts the AI's choice. If a future change makes the AI play worse, this
// fails — and a failure should mean we changed the design ON PURPOSE, not that we
// broke it by accident. Seeded, so results are reproducible.
//
// Run: docker compose -f docker/compose.yaml run --rm toolbox node test/domination-ai.mjs

import { createDomination } from '../app/src/games/domination/game.js';
import { dominationAim } from '../app/src/games/domination/ai.js';
import { applyScatter, AI_PROFILES, RING_RADIUS } from '../app/src/ai/scatter.js';
import { installSeededRandom } from './seeded-random.mjs';

const SEED = 7;
const N = 300;

function game(numPlayers, opts = {}) {
    const uuids = Array.from({ length: numPlayers }, (unused, i) => 'p' + i);
    return createDomination({ numPlayers, playerUuids: uuids, startingPlayerIndex: 0, ...opts });
}

// Force a play-phase state from an ownership map { cell: ownerIndex } (cells are
// numbers or 'bull'); `current` is up, with `thrown` darts already this turn.
function forcePlay(g, owned, current, thrown = 0) {
    const s = g.getState();
    for (const k of Object.keys(s.owners)) {
        s.owners[k] = null;
    }
    const tiles = s.players.map(() => 0);
    for (const [cell, owner] of Object.entries(owned)) {
        s.owners[cell === 'bull' ? 'bull' : Number(cell)] = owner;
        tiles[owner] += 1;
    }
    s.players.forEach((p, i) => {
        p.tiles = tiles[i];
        p.out = false;
        p.home = null;
    });
    s.phase = 'play';
    s.currentPlayerIndex = current;
    s.turn = { darts: Array.from({ length: thrown }, () => ({ ring: 'SO', segment: 1, hit: false, points: 0 })), locked: false };
    s.pendingRevert = {};
    s.isGameOver = false;
    g.loadState(s);
    return g;
}

// Distribution of the AI's aimed target ('bull' or a number) over N throws, a
// fresh scenario each time.
function aimDist(makeFresh, level) {
    installSeededRandom(SEED);
    const counts = {};
    for (let i = 0; i < N; i++) {
        const a = dominationAim(makeFresh().getState(), AI_PROFILES[level]);
        const key = a.segment === 25 ? 'bull' : String(a.segment);
        counts[key] = (counts[key] || 0) + 1;
    }
    return counts;
}

function frac(counts, keys) {
    const total = Object.values(counts).reduce((a, b) => a + b, 0) || 1;
    return keys.reduce((sum, k) => sum + (counts[String(k)] || 0), 0) / total;
}

const failures = [];
function check(name, ok, detail) {
    console.log(`${ok ? 'ok  ' : 'FAIL'} ${name}`);
    if (!ok) {
        failures.push(`${name} — ${detail}`);
    }
}

// 1. Assign: claim the free number in the biggest gap. With 20 & 6 taken, the
//    farthest from both are 7 and 16.
{
    const makeFresh = () => {
        const g = game(3, { numberAssignment: 'throw' });
        const s = g.getState();
        s.players[0].home = 20; s.owners[20] = 0; s.players[0].tiles = 1;
        s.players[1].home = 6; s.owners[6] = 1; s.players[1].tiles = 1;
        s.phase = 'assign'; s.assignIndex = 2; s.assignPos = 2;
        g.loadState(s);
        return g;
    };
    const d = aimDist(makeFresh, 10);
    check('assign claims the biggest gap (7/16, with 20 & 6 taken)', frac(d, [7, 16]) >= 0.95, JSON.stringify(d));
}

// 2. Bull-chasing scales smoothly with skill. Owning 17 (frontier = 2, 3, bull, all
//    neutral, the bull worth its hub reach): a weak AI rarely gambles on the small
//    target, an accurate one reliably grabs it, and the appetite climbs in between.
//    No hard gate — the scatter model's real hit-odds produce the whole ramp.
{
    const makeFresh = () => forcePlay(game(2, { bull: true }), { 17: 0, 20: 1 }, 0);
    const low = frac(aimDist(makeFresh, 2), ['bull']);
    const mid = frac(aimDist(makeFresh, 6), ['bull']);
    const high = frac(aimDist(makeFresh, 10), ['bull']);
    check('a weak AI (L2) rarely gambles on the bull', low <= 0.15, `L2 bull ${low.toFixed(2)}`);
    check('an accurate AI (L10) grabs the bull hub', high >= 0.9, `L10 bull ${high.toFixed(2)}`);
    check('bull appetite rises with skill (L2 < L6 < L10)', low < mid && mid < high, `L2 ${low.toFixed(2)} L6 ${mid.toFixed(2)} L10 ${high.toFixed(2)}`);
}

// 3. Grow rather than fight a non-leader. Bull off; P1 is the leader; the AI's
//    frontier is {2 (P2, a non-leader), 8 (neutral)} → take the free 8.
{
    const makeFresh = () => forcePlay(game(3, { bull: false }), {
        17: 0, 3: 0, 19: 0, 7: 0, 16: 0,
        14: 1, 9: 1, 12: 1, 5: 1, 20: 1, 1: 1, 18: 1, 4: 1,
        13: 2, 6: 2, 10: 2, 15: 2, 2: 2,
    }, 0);
    const d = aimDist(makeFresh, 5);
    check('grows into neutral rather than fighting a non-leader', frac(d, [8]) >= 0.9, JSON.stringify(d));
}

// 4. Contest the enemy front. Bull off; frontier {17 (borders P1's 2), 7 (open
//    space)} → claim 17, pressing the front.
{
    const makeFresh = () => forcePlay(game(3, { bull: false }), { 19: 0, 3: 0, 2: 1, 4: 1, 14: 2, 18: 2 }, 0);
    const d = aimDist(makeFresh, 5);
    check('claims the enemy-bordering neutral over open space', frac(d, [17]) >= 0.9, JSON.stringify(d));
}

// 5. Do attack the leader. Bull off; P1 is the leader and owns the AI's frontier
//    number 2, with neutral neighbours alongside → an accurate AI takes from the
//    leader rather than growing into a neutral.
{
    const makeFresh = () => forcePlay(game(3, { bull: false }), {
        17: 0, 16: 0,
        2: 1, 4: 1, 13: 1, 6: 1, 10: 1,
        15: 2, 20: 2,
    }, 0);
    const d = aimDist(makeFresh, 8);
    check('takes from the leader over a neutral (L8)', frac(d, [2]) >= 0.8, JSON.stringify(d));
}

// 6. Keep territory connected. AI owns the bull, three contiguous arcs tile the
//    board, nothing neutral (P1 leader). The bull makes EVERY enemy cell reachable,
//    but the AI should take 12 — the one leader cell adjacent to its own arc (so
//    exposed on a single side) — not an isolated jump like 20, nor the doubly
//    exposed 4 (a P1/P2 border cell either opponent could retake).
{
    const makeFresh = () => forcePlay(game(3, { bull: true }), {
        17: 0, 3: 0, 19: 0, 7: 0, 16: 0, 8: 0, 11: 0, 14: 0, 9: 0, bull: 0,
        12: 1, 5: 1, 20: 1, 1: 1, 18: 1, 4: 1,
        13: 2, 6: 2, 10: 2, 15: 2, 2: 2,
    }, 0);
    const d = aimDist(makeFresh, 10);
    check('takes the connected leader cell (12), not an isolated jump', frac(d, [12]) >= 0.95, JSON.stringify(d));
}

// 7. But it WILL jump for the leader. AI owns the bull; its arc {20, 1} touches
//    only P2 (a non-leader), while the leader P1 sits across the board, reachable
//    only via the bull. Connectivity must yield to denyLeader: the AI splits its
//    territory to hit a P1 cell rather than settle for a safe connected P2 capture.
{
    const P1_CELLS = [13, 6, 10, 15, 2];
    const makeFresh = () => forcePlay(game(3, { bull: true }), {
        20: 0, 1: 0, bull: 0,
        13: 1, 6: 1, 10: 1, 15: 1, 2: 1,
        18: 2, 5: 2,
    }, 0);
    const d = aimDist(makeFresh, 10);
    check('jumps via the bull to reach the leader over a safe non-leader cell', frac(d, P1_CELLS) >= 0.9 && frac(d, [18, 5]) === 0, JSON.stringify(d));
}

// 8. A shared lead is denied fairly. AI owns the bull and the whole 17..12 arc;
//    P1 (5..4) and P2 (13..2) are TIED for the lead (5 tiles each), and the AI can
//    take a connected cell off either — P1's 5 or P2's 2. Neither is "the" leader,
//    so both co-leaders score equally and the choice must SPLIT, not always fall on
//    the lower-indexed player.
{
    const makeFresh = () => forcePlay(game(3, { bull: true }), {
        17: 0, 3: 0, 19: 0, 7: 0, 16: 0, 8: 0, 11: 0, 14: 0, 9: 0, 12: 0, bull: 0,
        5: 1, 20: 1, 1: 1, 18: 1, 4: 1,
        13: 2, 6: 2, 10: 2, 15: 2, 2: 2,
    }, 0);
    const d = aimDist(makeFresh, 10);
    const balanced = frac(d, [5]) > 0.3 && frac(d, [2]) > 0.3;
    check('splits attacks between two tied co-leaders (not always the first)', balanced && frac(d, [5, 2]) >= 0.95, JSON.stringify(d));
}

// 9. Finish a kill it started. AI owns 3; P2 holds only 17 (adjacent) and P1 (the
//    leader) holds 19 and more. The AI neutralises 17 — reducing P2 to zero — so
//    claiming it this turn eliminates P2, while leaving it reverts P2 back in.
//    Removing a rival must beat chipping another tile off the leader, at any skill.
{
    const makeFresh = () => {
        const g = forcePlay(game(3, { bull: false }), { 3: 0, 17: 2, 19: 1, 7: 1, 16: 1, 8: 1 }, 0);
        g.onDart('SO', 17); // neutralise P2's only number → pending revert
        return g;
    };
    check('finishes a kill it started, at low skill (L3)', frac(aimDist(makeFresh, 3), [17]) >= 0.9, JSON.stringify(aimDist(makeFresh, 3)));
    check('finishes a kill it started, at high skill (L8)', frac(aimDist(makeFresh, 8), [17]) >= 0.9, JSON.stringify(aimDist(makeFresh, 8)));
}

// 10. Darts left change what's worth aiming at. A single on a 2-hit enemy only
//     neutralises — real progress with a dart left to finish it, a near-dead-end on
//     the last dart. So a weak AI goes after the fresh leader cell 19 far less on its
//     last dart than with darts in hand (preferring completable neutral claims).
//     AI owns 3 & 20; 19 is the leader P1's; 17, 5, 1 are neutral.
{
    const scen = (thrown) => () => forcePlay(game(3, { bull: false }),
        { 3: 0, 20: 0, 19: 1, 7: 1, 16: 1, 8: 1, 11: 1, 13: 2, 6: 2 }, 0, thrown);
    const spare = frac(aimDist(scen(0), 3), [19]); // 3 darts in hand
    const last = frac(aimDist(scen(2), 3), [19]); // last dart, no follow-up
    check('attacks a 2-hit enemy less on the last dart than with darts in hand', last < spare, `last ${last.toFixed(2)} spare ${spare.toFixed(2)}`);
}

// 11. Confident-capture aim depends on darts left. Both the treble and the double
//    capture on a hit; the treble's near-miss lands a single (a neutralise a
//    spare dart can finish), so it's the aim WITH darts in hand — but on the LAST
//    dart there's no follow-up, and the double is a surer clean hit, so it wins.
//    AI (0) owns 20; P1 (1) is the leader and owns 20's neighbour 5 → confident
//    AI takes 5.
{
    // How a confident L8 AI aims at the enemy 5 with `thrown` darts already used.
    function captureAims(thrown) {
        const makeFresh = () => forcePlay(game(2, { bull: false }), { 20: 0, 5: 1, 12: 1, 9: 1, 14: 1 }, 0, thrown);
        installSeededRandom(SEED);
        let treble = 0;
        let dbl = 0;
        for (let i = 0; i < N; i++) {
            const a = dominationAim(makeFresh().getState(), AI_PROFILES[8]);
            if (a.segment === 5 && a.radius === RING_RADIUS.treble) {
                treble += 1;
            }
            if (a.segment === 5 && a.radius === RING_RADIUS.double) {
                dbl += 1;
            }
        }
        return { treble, dbl };
    }
    const spare = captureAims(0); // 3 darts left
    const last = captureAims(2); // 1 dart left
    check('with darts in hand, a capture aims the treble (never the double)', spare.dbl === 0 && spare.treble > 0, JSON.stringify(spare));
    check('on the last dart, a capture aims the double (never the treble)', last.treble === 0 && last.dbl > 0, JSON.stringify(last));
}

// 12. Skill shows: level 10 beats level 1 across both turn orders.
{
    function play(levels, seed) {
        installSeededRandom(seed);
        const g = game(levels.length);
        let iters = 0;
        while (!g.getState().isGameOver && iters < 500000) {
            iters++;
            const s = g.getState();
            if (s.turn.locked || s.turn.darts.length >= s.dartsPerTurn) {
                g.nextPlayer();
                continue;
            }
            const idx = s.phase === 'assign' ? s.assignIndex : s.currentPlayerIndex;
            const p = AI_PROFILES[levels[idx]];
            const hit = applyScatter(dominationAim(s, p), p);
            g.onDart(hit.ring, hit.segment);
        }
        return g.getState().winner;
    }
    let strong = 0;
    let games = 0;
    for (const order of [[10, 1], [1, 10]]) {
        for (let seed = 1; seed <= 20; seed++) {
            games++;
            if (play(order, seed) === order.indexOf(10)) {
                strong += 1;
            }
        }
    }
    check(`level 10 beats level 1 (${strong}/${games})`, strong / games >= 0.85, `${strong}/${games}`);
}

console.log('');
if (failures.length > 0) {
    console.log(`FAILURES (${failures.length}):`);
    for (const f of failures) {
        console.log('  ' + f);
    }
    process.exit(1);
}
console.log('Domination AI strategy checks OK.');
