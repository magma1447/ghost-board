// Dartboard ring types and points calculation — the pure scoring domain, shared
// by game logic and the BLE layer (protocol.js maps raw sensor codes onto RING).
// Lives here so headless tools and games never depend on the BLE module.

// Ring types
export const RING = {
    SINGLE_OUTER: 'SO',
    SINGLE_INNER: 'SI',
    DOUBLE: 'D',
    TREBLE: 'T',
    SINGLE_BULL: 'SBULL',
    DOUBLE_BULL: 'DBULL',
    OUT: 'OUT',
};

// calcPoints with the bull-scoring option applied: in '50/50' mode the single
// bull scores 50 (like the double bull) instead of the standard 25.
export function pointsWithBullMode(ring, segment, bullMode) {
    if (bullMode === '50/50' && ring === RING.SINGLE_BULL) {
        return 50;
    }
    return calcPoints(ring, segment);
}

// Points calculation
export function calcPoints(ring, segment) {
    if (ring === RING.DOUBLE_BULL) {
        return 50;
    }
    if (ring === RING.SINGLE_BULL) {
        return 25;
    }
    if (ring === RING.OUT) {
        return 0;
    }
    if (ring === RING.DOUBLE) {
        return segment * 2;
    }
    if (ring === RING.TREBLE) {
        return segment * 3;
    }
    return segment; // SO and SI
}
