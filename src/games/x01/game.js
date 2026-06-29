// X01 game family (301, 501, 701, 1001).
//
// Players take turns throwing 3 darts, subtracting points from a starting score.
// First player to reach exactly 0 wins. Going below 0 (or to 1 with double-out)
// is a bust — score reverts to what it was at the start of the turn, and
// remaining darts are locked out.
//
// Returns { state, event, callouts } from onDart() and nextPlayer().
// Events: null, 'bust', 'win', 'draw', 'switch'
// Callout types: 'turnTotal' (after 3rd dart), 'remaining' (on switch),
//   'checkout' (per-dart when score is below threshold)

import { calcPoints } from '../../ble/protocol.js';

export function createX01({
    startingScore = 501,
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    doubleIn = false,
    doubleOut = false,
    bullMode = '25/50',
    maxRounds = 0,
    checkoutThreshold = 170,
} = {}) {
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], score: startingScore, visits: 0, scored: 0 });
    }

    const state = {
        type: 'x01',
        startingScore,
        doubleIn,
        doubleOut,
        bullMode,
        maxRounds,
        players,
        currentPlayerIndex: 0,
        turnDarts: [],
        turnStartScore: startingScore, // saved to revert on bust
        turnLocked: false, // true after bust — blocks remaining darts
        round: 1,
        gameOver: false,
        winner: null,
        opened: new Array(numPlayers).fill(!doubleIn), // per-player: has hit a double to "open"
    };

    // Ephemeral — tracks whether onDart already returned a turnTotal callout
    let turnTotalReturned = false;

    function currentPlayer() {
        return state.players[state.currentPlayerIndex];
    }

    function advancePlayer() {
        // Count the completed visit (for the 3-dart average): add the points
        // actually scored this turn and bump the visit count together, so the
        // average only changes at turn end — never mid-throw. Every turn
        // counts, including a missed turn that scored 0 (darts that miss the
        // board register nothing) and a bust (score reverted → 0 scored).
        const leaving = currentPlayer();
        leaving.scored += state.turnStartScore - leaving.score;
        leaving.visits++;
        state.turnDarts = [];
        state.turnLocked = false;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        if (state.currentPlayerIndex === 0) {
            state.round++;
        }
        state.turnStartScore = currentPlayer().score;

        if (maxRounds > 0 && state.round > maxRounds) {
            state.gameOver = true;
            state.winner = null;
            return 'draw';
        }
        return null;
    }

    function turnTotal() {
        return state.turnDarts.reduce((sum, d) => sum + d.points, 0);
    }

    function nextPlayer() {
        const callouts = [];

        // Turn total if not already spoken after 3rd dart
        if (!turnTotalReturned && state.turnDarts.length > 0) {
            callouts.push({ type: 'turnTotal', value: turnTotal() });
        }

        const drawEvent = advancePlayer();
        turnTotalReturned = false;

        // Remaining for the incoming player
        if (!state.gameOver) {
            callouts.push({ type: 'remaining', value: currentPlayer().score });
        }

        return { state, event: drawEvent || 'switch', callouts };
    }

    // In 50/50 bull mode, single bull scores 50 instead of the standard 25
    function getPoints(ring, segment) {
        if (bullMode === '50/50' && ring === 'SBULL') {
            return 50;
        }
        return calcPoints(ring, segment);
    }

    function isDouble(ring) {
        return ring === 'D' || ring === 'DBULL';
    }

    function onDart(ring, segment) {
        // Dart didn't count (game over, or turn already complete/locked) —
        // 'ignored' lets the UI skip audio while LEDs still flash.
        if (state.gameOver) {
            return { state, event: 'ignored', callouts: [] };
        }
        if (state.turnLocked || state.turnDarts.length >= dartsPerTurn) {
            return { state, event: 'ignored', callouts: [] };
        }

        const player = currentPlayer();
        const idx = state.currentPlayerIndex;

        // Double-in: darts before first double don't score
        if (!state.opened[idx]) {
            if (isDouble(ring)) {
                state.opened[idx] = true;
            } else {
                state.turnDarts.push({ ring, segment, points: 0 });
                return { state, event: null, callouts: [] };
            }
        }

        const points = getPoints(ring, segment);
        const newScore = player.score - points;

        // Bust: score went negative, or landed on 1 with double-out (impossible to finish)
        if (newScore < 0 || (doubleOut && newScore === 1)) {
            player.score = state.turnStartScore;
            state.turnLocked = true;
            turnTotalReturned = true; // suppress on switch
            return { state, event: 'bust', callouts: [] };
        }

        player.score = newScore;
        state.turnDarts.push({ ring, segment, points });

        // Reached exactly 0 — but with double-out, must finish on a double
        if (newScore === 0) {
            if (doubleOut && !isDouble(ring)) {
                player.score = state.turnStartScore;
                state.turnLocked = true;
                turnTotalReturned = true;
                return { state, event: 'bust', callouts: [] };
            }
            // Record the winning visit (no advancePlayer follows a win)
            player.scored += state.turnStartScore - player.score;
            player.visits++;
            state.gameOver = true;
            state.winner = state.currentPlayerIndex;
            turnTotalReturned = true;
            return { state, event: 'win', callouts: [] };
        }

        // Build callouts
        const callouts = [];
        if (state.turnDarts.length >= dartsPerTurn) {
            // 3rd dart — call turn total
            callouts.push({ type: 'turnTotal', value: turnTotal() });
            turnTotalReturned = true;
        } else if (checkoutThreshold > 0 && player.score <= checkoutThreshold) {
            callouts.push({ type: 'checkout', value: points, remaining: player.score });
        }

        return { state, event: null, callouts };
    }

    function getCallouts() {
        if (state.gameOver) {
            return [];
        }
        return [{ type: 'remaining', value: currentPlayer().score }];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
        turnTotalReturned = false;
    }

    // Big heads-up number for the current player: points remaining
    function getHeadline() {
        return String(currentPlayer().score);
    }

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
