// Shared game-logic helpers used across multiple game modes.
//
// These factor out the turn/round mechanics and ring-matching rules that were
// previously copy-pasted into each game.js. Games still own their scoring and
// win conditions — only the common skeleton lives here.

// The player whose turn it currently is.
export function currentPlayer(state) {
    return state.players[state.currentPlayerIndex];
}

// Does the dart's ring qualify as a hit under the given hit mode?
//   'doubles' — only the double ring
//   'triples' — only the triple ring
//   'any'     — any ring on the segment (single in/out, double, triple)
export function ringMatchesMode(ring, hitMode) {
    if (hitMode === 'doubles') {
        return ring === 'D';
    }
    if (hitMode === 'triples') {
        return ring === 'T';
    }
    return ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T';
}

// With multi-step enabled, doubles advance 2 targets and triples advance 3.
// (DBULL counts as a double for games that allow a bull target.)
export function stepsForRing(ring, multiStep) {
    if (!multiStep) {
        return 1;
    }
    if (ring === 'D' || ring === 'DBULL') {
        return 2;
    }
    if (ring === 'T') {
        return 3;
    }
    return 1;
}

// Common end-of-turn skeleton: stash the leaving player's darts, clear the
// turn, rotate to the next player, bump the round on wrap, and end in a draw
// if the round limit is exceeded. Returns 'draw' when the limit ends the game,
// otherwise null. Games with custom turn state (e.g. Cat and Mouse's sprint
// display, or Simon's per-round sequence) handle their own advance.
export function advancePlayerBase(state, maxRounds) {
    currentPlayer(state).lastDarts = state.turn.darts; // keep this turn visible until their next
    state.turn.darts = [];
    state.turn.locked = false;
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) {
        state.round++;
    }

    if (maxRounds !== null && state.round > maxRounds) {
        state.isGameOver = true;
        state.winner = null;
        return 'draw';
    }
    return null;
}
