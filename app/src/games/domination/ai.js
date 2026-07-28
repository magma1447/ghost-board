// Domination AI — greedy per-dart target scoring.
//
// Each dart, score every attackable cell by the value of OWNING it — a tile,
// plus bonuses for eliminating a player, denying the current leader, keeping my
// territory connected, and grabbing the bull hub — then aim at the best. Confident
// AIs take an enemy number outright in one dart — the treble (whose near-miss
// still lands a single, a neutralise a spare dart finishes) or, on the last dart
// with no follow-up, the surer double; timid AIs chip with singles (one hit, so
// a capture finishes over two darts). During the claim phase it picks a free
// number with room to grow.
//
// The weights are gut-feel starting values, meant to be tuned by play-testing —
// see the calibration brief in ../../ai/README.md.

import { RING_RADIUS, takesRisk } from '../../ai/scatter.js';
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

function isLastCell(state, playerIdx) {
    return state.players[playerIdx] && state.players[playerIdx].tiles === 1;
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

// Rough chance this profile lands the bull — a small (~16 mm) target, so it
// climbs slowly with skill (near 0 by mid-levels, ~1 when flawless). Used to
// discount the bull's high value by how likely the AI is to actually hit it, so
// weak AIs take a sure neighbour instead of blindly gambling on the hub.
function bullAccuracy(profile) {
    return Math.max(0, 1 - profile.scatterHorizontal / 25);
}

// Rough chance this profile lands a treble — a harder shot than a single, but a
// miss usually still hits the number as a single (a neutralise), so it's a mild
// discount with a floor. Used so a sure neighbour beats a low-odds enemy capture.
function captureAccuracy(profile) {
    return Math.max(0.2, 1 - profile.scatterHorizontal / 55);
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
    // finishes the capture. Otherwise it's whoever owns it now.
    const victim = cell in state.pendingRevert ? state.pendingRevert[cell] : state.owners[cell];
    if (victim !== null && victim !== undefined && victim !== me) {
        // Owning the number is worth the same as any claim (the base +1). No flat
        // capture bonus: in a 3+ player game, weakening a non-leader mostly helps
        // the leader. Only removing a rival (eliminate) or hitting a front-runner
        // (denyLeader — every opponent tied for the lead counts) is worth more
        // than a plain neutral claim.
        if (isLastCell(state, victim)) {
            v += W.eliminate;
        }
        if (leadTiles > 0 && state.players[victim].tiles === leadTiles) {
            v += W.denyLeader;
        }
    } else if (cell !== 'bull' && bordersEnemy(state, me, cell)) {
        // A neutral number touching an enemy — claiming it presses the front and
        // denies them the contested border, better than a neutral in open space.
        v += W.border;
    }
    return v;
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

export function dominationAim(state, profile) {
    if (state.phase === 'assign') {
        return assignAim(state);
    }

    const me = state.currentPlayerIndex;
    const leadTiles = leadingOpponentTiles(state, me);
    const risk = takesRisk(profile);
    const dartsLeft = state.dartsPerTurn - state.turn.darts.length;

    let bestAim = null;
    let bestScore = -Infinity;

    for (const cell of state.frontier) {
        const owner = state.owners[cell];
        const value = ownValue(state, me, cell, leadTiles);
        let score;
        let radius;

        if (owner === null) {
            // Neutral (including a cell I neutralised this turn) — one hit claims it.
            score = value;
            radius = cell === 'bull' ? RING_RADIUS.sbull : RING_RADIUS.any;
        } else if (risk) {
            // Confident: take the enemy number outright (two hits at once),
            // discounted by how reliably this profile lands the harder shot.
            score = value * captureAccuracy(profile);
            if (cell === 'bull') {
                radius = RING_RADIUS.bull;
            } else if (dartsLeft === 1) {
                // Last dart — no follow-up to finish a neutralise, so aim the
                // double: the larger ring is a surer clean hit, and its off-board
                // miss no longer costs us a finishable neutralise.
                radius = RING_RADIUS.double;
            } else {
                // Darts in hand — aim the treble: same capture on a hit, but a
                // near-miss lands a single (a neutralise the next dart finishes)
                // instead of the double's off-board overshoot.
                radius = RING_RADIUS.treble;
            }
        } else if (dartsLeft >= 2) {
            // Timid: a single neutralises now and claims next dart — only worth
            // starting if we can still finish the capture this turn.
            score = value * 0.6;
            radius = cell === 'bull' ? RING_RADIUS.sbull : RING_RADIUS.any;
        } else {
            // A single can't finish a capture with one dart left — take a
            // neighbour instead of a fruitless neutralise.
            continue;
        }

        // Discount the bull by the chance of actually landing it — only accurate
        // AIs should chase the hub; weaker ones prefer a reliable neighbour.
        if (cell === 'bull') {
            score *= bullAccuracy(profile);
        }

        score += jitter();
        if (score > bestScore) {
            bestScore = score;
            bestAim = { segment: cell === 'bull' ? 25 : cell, radius };
        }
    }

    // Nothing worth throwing at (rare) — a deliberate miss.
    return bestAim || { segment: 20, radius: RING_RADIUS.out };
}
