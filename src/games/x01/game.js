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
import { currentPlayer, advancePlayerBase } from '../game-helpers.js';
import { checkoutFor } from './checkout-sequence.js';

export function createX01({
    startingScore = 501,
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    doubleIn = false,
    doubleOut = false,
    bullMode = '25/50',
    maxRounds = null,
    checkoutThreshold = 170,
    startingPlayerIndex = 0,
} = {}) {
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], score: startingScore, visits: 0, scored: 0, lastDarts: [] });
    }

    const state = {
        type: 'x01',
        dartsPerTurn,
        options: { startingScore, doubleIn, doubleOut, bullMode, maxRounds, checkoutThreshold },
        players,
        currentPlayerIndex: startingPlayerIndex, // rotates each leg in match play
        // The in-progress turn: darts thrown, the score to revert to on bust,
        // and whether further darts are locked out (after a bust).
        turn: { darts: [], startScore: startingScore, locked: false },
        round: 1,
        isGameOver: false,
        winner: null,
        opened: new Array(numPlayers).fill(!doubleIn), // per-player: has hit a double to "open"
        targetSegments: [], // checkout numbers to light on the board (kept in sync below)
    };

    // Ephemeral — tracks whether onDart already returned a turnTotal callout
    let turnTotalReturned = false;

    function advancePlayer() {
        // Count the completed visit (for the 3-dart average) before rotating:
        // add the points actually scored this turn and bump the visit count
        // together, so the average only changes at turn end — never mid-throw.
        // Every turn counts, including a missed turn that scored 0 (darts that
        // miss the board register nothing) and a bust (score reverted → 0).
        const leaving = currentPlayer(state);
        leaving.scored += state.turn.startScore - leaving.score;
        leaving.visits++;

        const drawEvent = advancePlayerBase(state, maxRounds);
        state.turn.startScore = currentPlayer(state).score;
        return drawEvent;
    }

    function turnTotal() {
        return state.turn.darts.reduce((sum, d) => sum + d.points, 0);
    }

    function nextPlayer() {
        const callouts = [];

        // Turn total if not already spoken after 3rd dart
        if (!turnTotalReturned && state.turn.darts.length > 0) {
            callouts.push({ type: 'turnTotal', value: turnTotal() });
        }

        const drawEvent = advancePlayer();
        turnTotalReturned = false;

        // Remaining for the incoming player
        if (!state.isGameOver) {
            callouts.push({ type: 'remaining', value: currentPlayer(state).score });
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
        if (state.isGameOver) {
            return { state, event: 'ignored', callouts: [] };
        }
        if (state.turn.locked || state.turn.darts.length >= dartsPerTurn) {
            return { state, event: 'ignored', callouts: [] };
        }

        const player = currentPlayer(state);
        const idx = state.currentPlayerIndex;

        // Double-in: darts before first double don't score
        if (!state.opened[idx]) {
            if (isDouble(ring)) {
                state.opened[idx] = true;
            } else {
                state.turn.darts.push({ ring, segment, points: 0 });
                return { state, event: null, callouts: [] };
            }
        }

        const points = getPoints(ring, segment);
        const newScore = player.score - points;

        // Bust: score went negative, or landed on 1 with double-out (impossible to finish)
        if (newScore < 0 || (doubleOut && newScore === 1)) {
            player.score = state.turn.startScore;
            state.turn.locked = true;
            turnTotalReturned = true; // suppress on switch
            return { state, event: 'bust', callouts: [] };
        }

        player.score = newScore;
        state.turn.darts.push({ ring, segment, points });

        // Reached exactly 0 — but with double-out, must finish on a double
        if (newScore === 0) {
            if (doubleOut && !isDouble(ring)) {
                player.score = state.turn.startScore;
                state.turn.locked = true;
                turnTotalReturned = true;
                return { state, event: 'bust', callouts: [] };
            }
            // Record the winning visit (no advancePlayer follows a win)
            player.scored += state.turn.startScore - player.score;
            player.visits++;
            player.lastDarts = state.turn.darts.slice();
            state.isGameOver = true;
            state.winner = state.currentPlayerIndex;
            turnTotalReturned = true;
            return { state, event: 'win', callouts: [] };
        }

        // Build callouts
        const callouts = [];
        if (state.turn.darts.length >= dartsPerTurn) {
            // 3rd dart — call turn total
            callouts.push({ type: 'turnTotal', value: turnTotal() });
            turnTotalReturned = true;
        } else if (checkoutThreshold !== null && player.score <= checkoutThreshold) {
            callouts.push({ type: 'checkout', value: points, remaining: player.score });
        }

        return { state, event: null, callouts };
    }

    function getCallouts() {
        if (state.isGameOver) {
            return [];
        }
        return [{ type: 'remaining', value: currentPlayer(state).score }];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
        turnTotalReturned = false;
        refreshCheckoutTargets();
    }

    // Big heads-up number for the current player: points remaining
    function getHeadline() {
        return String(currentPlayer(state).score);
    }

    // Numbers (1–20) in the current player's checkout, for the board LED
    // highlight. Bull has no ring LED so it's dropped; treble/double collapse to
    // their number. Empty when there's no checkout.
    function checkoutTargetNumbers() {
        const path = checkoutFor(state);
        if (!path) {
            return [];
        }
        const numbers = [];
        for (const label of path) {
            if (label === 'D-Bull' || label === '25') {
                continue;
            }
            const n = parseInt(label.replace(/^[TD]/, ''), 10);
            if (n >= 1 && n <= 20 && !numbers.includes(n)) {
                numbers.push(n);
            }
        }
        return numbers;
    }

    // Keep the checkout LED targets in sync — showTargetLed lights targetSegments.
    function refreshCheckoutTargets() {
        state.targetSegments = checkoutTargetNumbers();
    }

    refreshCheckoutTargets();

    return {
        // Wrap the turn-advancing methods so the checkout LED targets refresh
        // after every dart and switch.
        onDart: (ring, segment) => {
            const result = onDart(ring, segment);
            refreshCheckoutTargets();
            return result;
        },
        nextPlayer: () => {
            const result = nextPlayer();
            refreshCheckoutTargets();
            return result;
        },
        getCallouts,
        getHeadline,
        getState,
        loadState,
    };
}
