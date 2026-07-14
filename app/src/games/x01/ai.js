// X01 — AI aim strategy.
//
// Hammer the treble 20 while the finish is out of reach; once a checkout fits the
// darts left, aim its first dart — the shared solver's path sets up and lands on
// the double. With no finish and a low score, lay up on a forgiving double rather
// than bust.

import { RING_RADIUS } from '../../ai/scatter.js';
import { checkoutFor } from './checkout-sequence.js';

// Convert an X01 checkout label ('T20', 'D20', '25', 'D-Bull', '9') to an aim.
function checkoutAim(label) {
    if (label === 'D-Bull' || label === '25') {
        return { segment: 25, radius: RING_RADIUS.bull };
    }
    if (label[0] === 'T') {
        return { segment: parseInt(label.slice(1), 10), radius: RING_RADIUS.treble };
    }
    if (label[0] === 'D') {
        return { segment: parseInt(label.slice(1), 10), radius: RING_RADIUS.double };
    }
    return { segment: parseInt(label, 10), radius: RING_RADIUS.any }; // plain single
}

// Value a leftover for the next visit (higher = better) so the fallback picks a
// shot that never busts and leaves the most out-chances for next time. Prefer
// sitting on a friendly, forgiving double — 40 and 32 are the classics, then any
// direct double (≤ 40 even), then any even, then odd. Applies to both finishes:
// leaving 40 beats 39 either way (D20 / 20+20, and misses stay outable). A dead 1
// is forbidden under double-out; it's fine under any-out (finish on S1).
function layupValue(left, doubleOut) {
    if (left <= 0) {
        return -Infinity; // a bust, or 0 with no finish available
    }
    if (doubleOut && left === 1) {
        return -Infinity; // dead — 1 can't be finished on a double
    }
    // Score down first: a smaller leftover is better, and this dominates (a T20
    // beats a stray single by ~60). A modest bonus then nudges close calls toward
    // a forgiving double, so 40/32/even win over odd only when the leftovers are
    // within a dart's reach — never worth throwing a tiny single just to fix
    // parity at a high score.
    let bonus = 0;
    if (left === 40 || left === 32) {
        bonus = 30; // the classic safe outs
    } else if (left <= 40 && left % 2 === 0) {
        bonus = 20; // a direct double
    } else if (left % 2 === 0) {
        bonus = 5; // even, but needs two darts
    }
    return -left + bonus;
}

// Fallback aim when no finish fits the darts remaining: pick the shot that never
// busts and leaves the best position. Candidates are the singles (precise
// lay-ups) plus the treble 20 (fastest score-down); the scatter model handles
// the risk of the chosen target.
function fallbackAim(score, doubleOut) {
    let best = { segment: 20, radius: RING_RADIUS.any, value: -Infinity };
    const consider = (segment, radius, shotValue) => {
        const value = layupValue(score - shotValue, doubleOut);
        if (value > best.value) {
            best = { segment, radius, value };
        }
    };
    for (let n = 1; n <= 20; n++) {
        consider(n, RING_RADIUS.any, n); // single n — a precise lay-up
    }
    consider(20, RING_RADIUS.treble, 60); // treble 20 — fastest score-down
    return { segment: best.segment, radius: best.radius };
}

export function x01Aim(state) {
    const index = state.currentPlayerIndex;
    const { doubleIn, doubleOut } = state.options;

    // Double-in and not yet opened: a double opens you (and scores). D20 = 40.
    if (doubleIn && state.opened && !state.opened[index]) {
        return { segment: 20, radius: RING_RADIUS.double };
    }

    // A finish that fits the darts remaining → aim its first dart.
    const path = checkoutFor(state);
    if (path && path.length > 0) {
        return checkoutAim(path[0]);
    }

    // No finish this visit: reduce without busting and lay up as well as we can.
    return fallbackAim(state.players[index].score, doubleOut);
}
