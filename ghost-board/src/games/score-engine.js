// Shared score-accumulation engine for point-adding games (Count Up, Score
// Rush). Players add each dart's value to a running total; the games differ
// only in how they end:
//   endMode 'rounds' — highest total after a fixed number of rounds wins
//                      (ties resolved by onDraw: draw / sudden death)
//   endMode 'target' — first to reach a target score wins, the instant they
//                      cross it (no exact finish, unlike X01)
//
// X01 stays its own module — its bust / double-out / exact-checkout rules
// differ fundamentally. Only these accumulate-and-compare games share this.
//
// Returns { state, event, callouts } from onDart() and nextPlayer().
// Events: null, 'miss', 'win', 'draw', 'switch', 'ignored'
// Callout types: 'turnTotal' (after the 3rd dart), 'remaining' (running total
//   on switch).

import { calcPoints } from '../ble/protocol.js';
import { currentPlayer } from './game-helpers.js';

export function createScoreGame({
    type,
    endMode = 'rounds',
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    bullMode = '25/50',
    singlesOnly = false,
    maxRounds = 8,
    targetScore = 300,
    onDraw = 'draw',
    startingPlayerIndex = 0,
} = {}) {
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], score: 0, visits: 0, scored: 0, lastDarts: [] });
    }

    const state = {
        type,
        dartsPerTurn,
        options: { endMode, maxRounds, targetScore, bullMode, singlesOnly, onDraw },
        players,
        currentPlayerIndex: startingPlayerIndex, // rotates each leg in match play
        turn: { darts: [], locked: false },
        round: 1,
        isGameOver: false,
        winner: null,
        targetSegments: [], // no fixed targets; nothing to light on the board
    };

    // Ephemeral — whether onDart already emitted this turn's total callout
    let turnTotalReturned = false;

    function getPoints(ring, segment) {
        // In 50/50 bull mode, single bull scores 50 instead of the standard 25
        if (bullMode === '50/50' && ring === 'SBULL') {
            return 50;
        }
        // Beginner-friendly: doubles and trebles score their face (single)
        // value; bull is untouched (governed by bull scoring).
        if (singlesOnly && (ring === 'D' || ring === 'T')) {
            return segment;
        }
        return calcPoints(ring, segment);
    }

    function turnTotal() {
        return state.turn.darts.reduce((sum, d) => sum + d.points, 0);
    }

    // Count the just-completed turn toward the 3-dart average.
    function recordVisit(player) {
        player.scored += turnTotal();
        player.visits++;
    }

    // Highest total wins; a tie for the lead returns null (draw / sudden death).
    function determineWinner() {
        let best = -1;
        let bestIdx = null;
        let tie = false;
        for (let i = 0; i < state.players.length; i++) {
            if (state.players[i].score > best) {
                best = state.players[i].score;
                bestIdx = i;
                tie = false;
            } else if (state.players[i].score === best) {
                tie = true;
            }
        }
        return tie ? null : bestIdx;
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
        const points = getPoints(ring, segment);
        player.score += points;
        state.turn.darts.push({ ring, segment, points });

        // Race: first to reach the target wins the instant they cross it
        if (endMode === 'target' && player.score >= targetScore) {
            recordVisit(player);
            player.lastDarts = state.turn.darts.slice();
            state.isGameOver = true;
            state.winner = state.currentPlayerIndex;
            turnTotalReturned = true;
            return { state, event: 'win', callouts: [] };
        }

        const callouts = [];
        if (state.turn.darts.length >= dartsPerTurn) {
            callouts.push({ type: 'turnTotal', value: turnTotal() });
            turnTotalReturned = true;
        }

        // A dart that missed the board scores nothing → 'miss' feedback
        return { state, event: points > 0 ? null : 'miss', callouts };
    }

    function nextPlayer() {
        const callouts = [];
        // Turn total if not already spoken after the 3rd dart
        if (!turnTotalReturned && state.turn.darts.length > 0) {
            callouts.push({ type: 'turnTotal', value: turnTotal() });
        }

        recordVisit(currentPlayer(state));
        currentPlayer(state).lastDarts = state.turn.darts; // keep visible until their next turn
        state.turn.darts = [];
        state.turn.locked = false;
        turnTotalReturned = false;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

        if (state.currentPlayerIndex === 0) {
            // All players completed this round
            state.round++;
            // Round-limited games end at the limit (target games end in onDart)
            if (endMode === 'rounds' && maxRounds !== null && state.round > maxRounds) {
                const winner = determineWinner();
                // End unless it's a tie and we play until a winner (sudden death)
                if (winner !== null || onDraw === 'draw') {
                    state.isGameOver = true;
                    state.winner = winner;
                    return { state, event: winner !== null ? 'win' : 'draw', callouts };
                }
            }
        }

        // Announce the incoming player's running total
        callouts.push({ type: 'remaining', value: currentPlayer(state).score });
        return { state, event: 'switch', callouts };
    }

    // First player never gets a nextPlayer call; nothing meaningful at 0.
    function getCallouts() {
        return [];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
        turnTotalReturned = false;
    }

    // Big heads-up number for the current player: their running total
    function getHeadline() {
        return String(currentPlayer(state).score);
    }

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
