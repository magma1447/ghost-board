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

import { pointsWithBullMode } from './board-score.js';
import { currentPlayer, advancePlayerBase, createTurnEndCallout, ignoredDart, highestScoreWinner } from './game-helpers.js';

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

    // The turn total belongs to the turn that just ended — spoken on the last
    // dart, or as a switch fallback if that dart went undetected.
    const turnEnd = createTurnEndCallout();

    function getPoints(ring, segment) {
        // Beginner-friendly: doubles and trebles score their face (single)
        // value; bull is untouched (governed by bull scoring).
        if (singlesOnly && (ring === 'D' || ring === 'T')) {
            return segment;
        }
        return pointsWithBullMode(ring, segment, bullMode);
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
        return highestScoreWinner(state.players);
    }

    function onDart(ring, segment) {
        const ignored = ignoredDart(state, dartsPerTurn);
        if (ignored) {
            return ignored;
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
            turnEnd.suppress();
            return { state, event: 'win', callouts: [] };
        }

        // End of turn (last dart landed): call the turn total now, not on the switch.
        const callouts = [];
        if (state.turn.darts.length >= dartsPerTurn) {
            callouts.push(turnEnd.onTurnEnd(() => ({ type: 'turnTotal', value: turnTotal() })));
        }

        // A dart that missed the board scores nothing → 'miss' feedback
        return { state, event: points > 0 ? null : 'miss', callouts };
    }

    function nextPlayer() {
        const callouts = [];
        // Turn total — fallback for an undetected last dart (normally the 3rd).
        const totalCall = turnEnd.onSwitch(() => (state.turn.darts.length > 0
            ? { type: 'turnTotal', value: turnTotal() }
            : null));
        if (totalCall) {
            callouts.push(totalCall);
        }

        recordVisit(currentPlayer(state)); // the leaving player, before the rotate
        // Count Up resolves a winner at the round limit; Score Rush ends in onDart
        // (first to the target), so it never ends on a round.
        const event = endMode === 'rounds'
            ? advancePlayerBase(state, maxRounds, { determineWinner, onDraw })
            : advancePlayerBase(state, null);
        if (event) {
            return { state, event, callouts };
        }

        // Announce the incoming player's running total (start of round).
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
    }

    // Big heads-up number for the current player: their running total
    function getHeadline() {
        return String(currentPlayer(state).score);
    }

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
