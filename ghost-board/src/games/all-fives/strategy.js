// All Fives — shared save/room reasoning, used by BOTH the on-board LED guidance
// (game.js) and the AI aim (ai.js) so the two can never drift apart.

// Raw points the turn may still add without overshooting the exact target
// (Infinity when overshoot is allowed — there's no bust to avoid then).
export function roomLeft(score, turnRaw, target, allowOvershoot) {
    return allowOvershoot ? Infinity : (target - score) * 5 - turnRaw;
}

// The single value that would bring the running total back onto a five — 0 when
// it's already on one.
export function neededSingle(turnRaw) {
    return (5 - (turnRaw % 5)) % 5;
}

// Numbers whose SINGLE lands the total on a five and fits the room — the safe
// last-dart saves. Empty when the total is already on a five.
export function saveNumbers(turnRaw, room) {
    const need = neededSingle(turnRaw);
    if (need === 0) {
        return [];
    }
    const out = [];
    for (let n = need; n <= 20; n += 5) {
        if (n <= room) {
            out.push(n);
        }
    }
    return out;
}

// Numbers whose TREBLE lands the total on a five and fits the room — the
// higher-value (harder) saves a confident thrower goes for.
export function trebleSaves(turnRaw, room) {
    const out = [];
    for (let n = 1; n <= 20; n++) {
        const add = 3 * n;
        if (add <= room && (turnRaw + add) % 5 === 0) {
            out.push(n);
        }
    }
    return out;
}

// Hittable multiples of 5 (a single / double / treble of a five-number), biggest
// first, each with the segment + ring that scores it. Bull is left out — 25 / 50
// can't be aimed precisely enough to pace an exact finish.
export const FIVE_AIMS = [
    { value: 60, segment: 20, ring: 'treble' },
    { value: 45, segment: 15, ring: 'treble' },
    { value: 40, segment: 20, ring: 'double' },
    { value: 30, segment: 15, ring: 'double' },
    { value: 20, segment: 20, ring: 'any' },
    { value: 15, segment: 15, ring: 'any' },
    { value: 10, segment: 10, ring: 'any' },
    { value: 5, segment: 5, ring: 'any' },
];

// The biggest multiple-of-5 aim whose value fits `cap` — for making safe progress
// toward the target. Null when nothing fits (too tight to add a five this dart).
export function bestFive(cap) {
    return FIVE_AIMS.find((a) => a.value <= cap) || null;
}

// A ONE-dart finish: hit exactly `room` (the raw needed to land on the target) so
// the turn ends this dart — not just a multiple of 5. Single first (easiest and
// safest), then double, then treble; null when no single dart hits it.
export function finishAim(room) {
    if (room >= 1 && room <= 20) {
        return { segment: room, ring: 'any' };
    }
    if (room % 2 === 0 && room <= 40) {
        return { segment: room / 2, ring: 'double' };
    }
    if (room % 3 === 0 && room <= 60) {
        return { segment: room / 3, ring: 'treble' };
    }
    if (room === 50) {
        return { segment: 50, ring: 'bull' }; // double bull
    }
    if (room === 25) {
        return { segment: 25, ring: 'sbull' }; // single bull — precise (risks the double bull)
    }
    return null;
}
