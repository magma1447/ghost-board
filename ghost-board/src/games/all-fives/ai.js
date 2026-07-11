// All Fives — AI aim strategy (confidence-graduated; see #77 / #78).
//
// Finish in one dart when possible — a single always, a double / treble / double
// bull when confident, the single bull only at near-perfect confidence (a pull
// toward the centre hits the double bull). Otherwise aim 20 far out (treble for
// max when confident, else the fat single), the biggest safe five as the finish
// nears, or save the last dart back onto a five. Everything caps to the room
// left, so the AI never overshoots the exact target (#78). When there's no safe
// move it gives the turn up cleanly rather than busting.

import { RING_RADIUS, takesRisk } from '../../ai/scatter.js';
import { roomLeft, neededSingle, saveNumbers, trebleSaves, bestFive, finishAim } from './strategy.js';

const RING = {
    treble: RING_RADIUS.treble,
    double: RING_RADIUS.double,
    any: RING_RADIUS.any,
    bull: RING_RADIUS.bull,
    sbull: RING_RADIUS.sbull,
};

// Give the turn up cleanly (can't score without busting). On a five, a scoring
// five would overshoot — break it with a small single so the turn scores nothing;
// off a five it already scores nothing, so throw it off the board.
function wasteAim(raw) {
    if (raw % 5 === 0) {
        return { segment: 1, radius: RING_RADIUS.any };
    }
    return { segment: 20, radius: RING_RADIUS.out };
}

export function allFivesAim(state, profile) {
    const player = state.players[state.currentPlayerIndex];
    const raw = state.turn.darts.reduce((sum, d) => sum + d.points, 0);
    const { target, allowOvershoot } = state.options;
    const isLast = state.turn.darts.length === state.dartsPerTurn - 1;
    const room = roomLeft(player.score, raw, target, allowOvershoot);

    // Finish in one dart if we can (fewer darts = more finishing chances).
    if (!allowOvershoot) {
        const finish = finishAim(room);
        if (finish) {
            const take = finish.ring === 'any'
                || (finish.ring === 'sbull' ? profile.confidence >= 0.95 : takesRisk(profile));
            if (take) {
                return { segment: finish.segment, radius: RING[finish.ring] };
            }
        }
    }

    // Last dart, off a five — save it back on (treble save when confident).
    if (isLast && neededSingle(raw) !== 0) {
        if (takesRisk(profile)) {
            const trebles = trebleSaves(raw, room);
            if (trebles.length > 0) {
                return { segment: Math.max(...trebles), radius: RING_RADIUS.treble };
            }
        }
        const singles = saveNumbers(raw, room);
        if (singles.length > 0) {
            return { segment: Math.max(...singles), radius: RING_RADIUS.any };
        }
        return wasteAim(raw);
    }

    // Far from the finish: aim 20 (treble when confident, else the fat single).
    if (room >= 60) {
        return { segment: 20, radius: takesRisk(profile) ? RING_RADIUS.treble : RING_RADIUS.any };
    }
    // Progress toward the finish: the biggest safe five that fits.
    const five = bestFive(room);
    if (!five) {
        return wasteAim(raw);
    }
    return { segment: five.segment, radius: RING[five.ring] };
}
