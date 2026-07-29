// Domination AI — expected-value aim over the dart-scatter odds.
//
// Each dart, score every attackable cell by its EXPECTED outcome under the scatter
// — where the dart really lands, not where it was aimed — then grow into the best
// free cell unless a good-odds enemy capture is worth attacking (see
// ATTACK_THRESHOLD). The odds of landing on each cell come from ../../ai/aim-odds.js
// (computed once per aim+level and cached); here we just score each possible
// landing with ownValue and let that engine weigh them by the thrower's judgement.
// Because value is over the real landing spread, the low end plays realistically
// for free: a weak AI aims where a miss still pays off — into enemy interior when
// it holds the bull, so a wayward dart still hits a takeable number — and only
// chases the bull once it's accurate enough to land it. No hand-tuned accuracy
// factors; the scatter odds supply them, and the thrower's confidence supplies how
// sharply it reads those odds (a beginner misjudges, a pro decides exactly).
//
// Each landing is scored by ownValue — a tile, plus bonuses for eliminating a
// rival, denying a front-runner, and keeping my territory connected. Enemy numbers
// are aimed at the treble (its near-miss still neutralises), or the double on the
// last dart; the claim phase picks a free number in the biggest gap.
//
// The value weights are gut-feel starting values, meant to be tuned by play-testing
// (or self-play) — see the calibration brief in ../../ai/README.md.

import { RING_RADIUS } from '../../ai/scatter.js';
import { expectedAimValue, captureChance, bullHitChance } from '../../ai/aim-odds.js';
import { BOARD_ORDER } from '../../board/segments.js';

const RING_INDEX = new Map(BOARD_ORDER.map((num, i) => [num, i]));
function ringNeighbours(num) {
    const i = RING_INDEX.get(num);
    return [BOARD_ORDER[(i + 19) % 20], BOARD_ORDER[(i + 1) % 20]];
}

// Tunable weights (a "tile" is worth 1).
const W = {
    bull: 2.5, // the hub is worth a lot of reach
    eliminate: 3, // knocking a rival out — always worth it (one fewer competitor)
    denyLeader: 1.5, // taking from the front-runner — the only capture that swings
    connect: 0.4, // per ring-neighbour already mine — keeps territory joined up
    border: 0.4, // claiming a neutral that touches an enemy — contests the front
};

// A single hit only neutralises an enemy number (it takes two to capture it), and
// a neutralise is cheap: it's temporary (the enemy reclaims it), and finishing it
// over two darts is a +1-1 when two darts on neutrals would be +2. So it's worth
// little — meaning an attack pays off mainly when you can CAPTURE in one dart (a
// treble/double), which the odds decide. Even less on the last dart (can't finish).
const NEUTRALISE_FRACTION = 0.15;
const DEADEND_FRACTION = 0.05;

// Does this cell border an enemy (an owned-by-someone-else neighbour)?
function bordersEnemy(state, me, cell) {
    const neighbours = cell === 'bull' ? BOARD_ORDER : ringNeighbours(cell);
    return neighbours.some((nb) => {
        const o = state.owners[nb];
        return o !== null && o !== undefined && o !== me;
    });
}

// The most territory any one opponent still holds — the tile count that marks a
// front-runner (0 if every opponent is out). Every opponent tied at this count is
// a co-leader worth denying equally: when a lead is shared, we return the count,
// not a single player, so the AI doesn't fixate on whichever happens to come
// first — the tied targets score equally and jitter splits the choice fairly.
function leadingOpponentTiles(state, me) {
    let best = 0;
    state.players.forEach((p, i) => {
        if (i !== me && !p.out && p.tiles > best) {
            best = p.tiles;
        }
    });
    return best;
}

// How many of this cell's two ring neighbours I already own. The more, the more a
// capture extends my own arc rather than stranding an outpost — so the fewer sides
// an opponent can retake it from. Ring only: the bull touches every number, so
// counting it would falsely mark every cell "connected" once I hold the hub.
function friendlyRingNeighbours(state, me, cell) {
    if (cell === 'bull') {
        return 0;
    }
    return ringNeighbours(cell).reduce((n, nb) => n + (state.owners[nb] === me ? 1 : 0), 0);
}

// A double, treble, or double-bull lands two hits at once (enough to take an enemy
// number outright); anything else is one hit. Mirrors the game's own rule.
function hitStrength(ring) {
    return ring === 'D' || ring === 'T' || ring === 'DBULL' ? 2 : 1;
}

// Which cell a dart landed on: a number 1–20, 'bull' (only when the bull is in
// play), or null (off the board, or a bull hit with the bull disabled). Mirrors
// the game's cellFor; bull-in-play is read from whether it's a cell at all.
function cellFor(state, ring, segment) {
    if (ring === 'SBULL' || ring === 'DBULL') {
        return 'bull' in state.owners ? 'bull' : null;
    }
    return segment >= 1 && segment <= 20 ? segment : null;
}

// Value of ending up owning this cell. `leadTiles` is the front-runner's tile
// count (see leadingOpponentTiles) — a victim matching it is a (co-)leader.
function ownValue(state, me, cell, leadTiles) {
    let v = 1;
    if (cell === 'bull') {
        v += W.bull; // the hub's reach is its worth
    } else {
        // Prefer captures that extend my own arc — a connected cell is exposed on
        // fewer sides, so it's harder to lose back. Jumping to an isolated cell is
        // only worth it for a bigger prize: denyLeader/eliminate below outweigh
        // this, so the AI still splits its territory to reach the leader when it
        // has no connected route, but otherwise advances as a solid front.
        v += W.connect * friendlyRingNeighbours(state, me, cell);
    }
    // A cell I neutralised this turn belongs to its pending owner; claiming it
    // finishes the capture (and the kill). Otherwise it's whoever owns it now.
    const pending = cell in state.pendingRevert;
    const victim = pending ? state.pendingRevert[cell] : state.owners[cell];
    if (victim !== null && victim !== undefined && victim !== me) {
        // Owning the number is worth the same as any claim (the base +1). No flat
        // capture bonus: in a 3+ player game, weakening a non-leader mostly helps
        // the leader. Only removing a rival (eliminate) or hitting a front-runner
        // (denyLeader — every opponent tied for the lead counts) is worth more
        // than a plain neutral claim.
        const victimTiles = state.players[victim].tiles;
        // Owning this eliminates the victim if it leaves them with none: a number
        // they still hold that's their last, or one I already neutralised this turn
        // (pending revert, so their count is 0) that claiming would finish off.
        if (pending ? victimTiles === 0 : victimTiles === 1) {
            v += W.eliminate;
        }
        if (leadTiles > 0 && victimTiles === leadTiles) {
            v += W.denyLeader;
        }
    } else if (cell !== 'bull' && bordersEnemy(state, me, cell)) {
        // A neutral number touching an enemy — claiming it presses the front and
        // denies them the contested border, better than a neutral in open space.
        v += W.border;
    }
    return v;
}

// What a dart that landed at (ring, segment) actually accomplishes for me: ownValue
// when it captures or claims a cell, a fraction of that when it only neutralises,
// and nothing when it lands on my own cell, a last number (which reverts), off the
// board, or anywhere not adjacent to my territory. Averaging this over the scatter
// is what makes aiming where a miss still lands value come out ahead.
function outcomeValue(state, me, ring, segment, leadTiles, dartsLeft) {
    const cell = cellFor(state, ring, segment);
    if (cell === null || !state.frontier.includes(cell)) {
        return 0; // off the board, my own cell, or not adjacent — no effect
    }
    const owner = state.owners[cell];
    if (owner === null) {
        return ownValue(state, me, cell, leadTiles); // neutral (incl. one I neutralised) — one hit claims it, complete
    }
    if (hitStrength(ring) >= 2) {
        return ownValue(state, me, cell, leadTiles); // enemy — a double/treble takes it outright, complete
    }
    // A single only neutralises — partial, and only worth it if a later dart can
    // finish it (see NEUTRALISE_FRACTION vs DEADEND_FRACTION).
    if (state.players[owner].tiles === 1) {
        // Their LAST number: a single queues a revert; claiming it next dart is the
        // kill. Worth chasing only with a dart still in hand — on the last dart it
        // just reverts, achieving nothing.
        return dartsLeft >= 2 ? NEUTRALISE_FRACTION * ownValue(state, me, cell, leadTiles) : 0;
    }
    const fraction = dartsLeft >= 2 ? NEUTRALISE_FRACTION : DEADEND_FRACTION;
    return fraction * ownValue(state, me, cell, leadTiles);
}

// The ring to aim a candidate at: the fat single claims a neutral in one hit; an
// enemy needs two, so aim the treble (its near-miss still neutralises) — except on
// the last dart, where the double is a surer clean hit with no follow-up to finish
// a neutralise. The bull is a point target.
function aimRadiusFor(state, cell, dartsLeft) {
    if (cell === 'bull') {
        return RING_RADIUS.bull;
    }
    if (state.owners[cell] === null) {
        return RING_RADIUS.any;
    }
    return dartsLeft === 1 ? RING_RADIUS.double : RING_RADIUS.treble;
}

// A little symmetric noise so equally-ranked cells don't always tie the same way.
function jitter() {
    return (Math.random() - 0.5) * 0.05;
}

// Ring distance between two numbers, in board segments (0–10).
function ringDistance(a, b) {
    const d = Math.abs(RING_INDEX.get(a) - RING_INDEX.get(b));
    return Math.min(d, 20 - d);
}

// Claim phase: aim at the free number in the biggest gap — the one farthest from
// every already-claimed number, so there's the most uncontested room to spread.
function assignAim(state) {
    const taken = state.players.filter((p) => p.home !== null).map((p) => p.home);
    let best = 20;
    let bestScore = -Infinity;
    for (const n of BOARD_ORDER) {
        if (taken.includes(n)) {
            continue;
        }
        const nearest = taken.length ? Math.min(...taken.map((t) => ringDistance(n, t))) : 10;
        const score = nearest + (Math.random() - 0.5) * 0.4; // tiny noise breaks ties
        if (score > bestScore) {
            bestScore = score;
            best = n;
        }
    }
    return { segment: best, radius: RING_RADIUS.any };
}

// Attack an enemy number only when the odds of taking it in ONE dart (a double or
// treble) clear this — otherwise grow into a free cell. Attacking over two darts is
// a +1-1 when two darts on free cells would be +2, so it only pays when you can
// capture cleanly. The value was tuned by self-play: three L5 AIs — always-attack,
// always-grow, and this odds-threshold — played thousands of full 3-player games.
// Always-attacking won the LEAST (~24%), always-growing did well (~37%), and the
// threshold won the most at ~0.4 (a plateau across 0.3–0.5) — so ~40% one-dart odds,
// well below the ~70% we'd have guessed. See test/domination-attack-tuning.mjs.
const ATTACK_THRESHOLD = 0.4;

// Go for the (neutral) bull whenever the odds of hitting it clear this floor.
// Holding the hub makes the whole board attackable, and self-play was emphatic:
// always taking an available bull won ~46-72% of games, never taking it ~10-15%,
// AT L5 — so grabbing it is right even at low skill, and the threshold is only a
// floor ("is a hit plausible at all", so the very lowest levels don't chuck darts
// at an unhittable centre), not an expected-value contest. A floor of ~0.1 matched
// always-bull at L5 while sparing L1-L2 the futile attempt. See
// test/domination-bull-tuning.mjs.
const BULL_THRESHOLD = 0.1;

export function dominationAim(state, profile, options = {}) {
    if (state.phase === 'assign') {
        return assignAim(state);
    }

    const me = state.currentPlayerIndex;
    const leadTiles = leadingOpponentTiles(state, me);
    const dartsLeft = state.dartsPerTurn - state.turn.darts.length;
    // Score a landing (ring, segment) by what it achieves on the current board.
    const valueOf = (ring, segment) => outcomeValue(state, me, ring, segment, leadTiles, dartsLeft);

    // Sort frontier aims into three kinds, each ranked by expected value under the
    // scatter odds (see aim-odds.js): an enemy capture (with its one-dart odds), a
    // free numbered cell (sure growth), and the neutral bull (a hard central target,
    // with its hit odds). A tiny jitter breaks ties. Policies below choose between
    // them, gating the two hard targets — enemy, bull — on their odds.
    let bestEnemy = null;
    let bestEnemyScore = -Infinity;
    let bestEnemyChance = 0;
    let bestSafe = null;
    let bestSafeScore = -Infinity;
    let bull = null;
    let bullChance = 0;

    for (const cell of state.frontier) {
        const aim = { segment: cell === 'bull' ? 25 : cell, radius: aimRadiusFor(state, cell, dartsLeft) };
        const owner = state.owners[cell];
        if (cell === 'bull' && (owner === null || owner === undefined)) {
            // The bull is chosen by its hit-odds floor below, not expected value.
            bull = aim;
            bullChance = bullHitChance(aim, profile);
            continue;
        }
        const score = expectedAimValue(aim, profile, valueOf) + jitter();
        if (owner !== null && owner !== undefined && owner !== me) {
            if (score > bestEnemyScore) {
                bestEnemyScore = score;
                bestEnemy = aim;
                bestEnemyChance = captureChance(aim, profile, aim.segment);
            }
        } else if (score > bestSafeScore) {
            bestSafeScore = score;
            bestSafe = aim;
        }
    }

    // Growth target: the best sure cell to claim — but strongly prefer grabbing the
    // (neutral) bull whenever we can realistically hit it, since holding the hub makes
    // the whole board attackable. Self-play showed always-taking an available bull
    // wins big and never-taking loses badly (even at low skill), so the threshold is
    // just a floor — "is a hit plausible at all" — not an expected-value contest.
    // (options.bullPolicy overrides for tuning: 'bull' always, 'noBull' never, a
    // number is a custom odds floor.)
    let growth = bestSafe;
    if (bull) {
        const bullPolicy = options.bullPolicy ?? BULL_THRESHOLD;
        const takeBull = bullPolicy === 'bull' || (bullPolicy !== 'noBull' && bullChance >= bullPolicy);
        if (takeBull || growth === null) {
            growth = bull;
        }
    }

    // Attack vs grow. (options.attackPolicy overrides for tuning: 'attack' always
    // takes an enemy, 'neutral' always grows, a number is a custom odds threshold.)
    const attackPolicy = options.attackPolicy ?? ATTACK_THRESHOLD;
    const attack = attackPolicy === 'attack'
        || (attackPolicy !== 'neutral' && bestEnemy && bestEnemyChance >= attackPolicy);
    if (attack && bestEnemy) {
        return bestEnemy;
    }
    // Nothing worth throwing at (rare) — a deliberate miss.
    return growth || bestEnemy || bull || { segment: 20, radius: RING_RADIUS.out };
}
