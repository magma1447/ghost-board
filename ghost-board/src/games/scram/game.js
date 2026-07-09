// Scram — a two-player Cricket spinoff played in two halves. In each half one
// player is the STOPPER, racing to close every number (three marks each), and
// the other is the SCORER, piling up points on every number that's still open.
// When the stopper shuts the last number the half ends: the roles swap, the
// numbers reopen, and the other player gets their turn to score. Most points
// across both halves wins.
//
// Numbers/marks are Cricket's: single = 1, double = 2, treble = 3; outer bull =
// 1, inner bull = 2. A number is closed at 3 marks and worth its face value
// (bull = 25). Only the scorer earns points, and only on numbers not yet closed.
//
// Returns { state, event, callouts } from onDart() and nextPlayer().
// Events: null (mark / score), 'miss', 'switch', 'win', 'draw', 'ignored',
//   'half'. 'half' is the general phase/role-transition event: the game has
//   already advanced into the new phase and put the overlay text in
//   state.transition = { title, subtitle }; the controller shows that overlay
//   and auto-advances (no Next Player press). Here it fires when the stopper
//   shuts the last number, ending the half on that dart.

import { currentPlayer, createTurnEndCallout } from '../game-helpers.js';
import { buildNumbers, dartMarks, numberValue } from '../cricket-marks.js';

export function createScram({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    numberSet = 'standard',
    onDraw = 'draw',
    startingPlayerIndex = 0,
} = {}) {
    const numbers = buildNumbers(numberSet);

    // Scram is a two-player game; the roster enforces exactly two.
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], score: 0, lastDarts: [] });
    }

    const marks = {};
    for (const n of numbers) {
        marks[n] = 0;
    }

    const state = {
        type: 'scram',
        dartsPerTurn,
        options: { numberSet, onDraw },
        numbers,
        baseNumbers: numbers, // the full set; sudden death draws random subsets from it
        marks, // this half's close-out progress; reset each half
        players, // score accumulates across the whole game
        stopperIndex: startingPlayerIndex, // who closes this half
        phase: 1, // half number (1, 2; then 3, 4… only in sudden death)
        round: 1, // kept === phase for the panel's round label
        currentPlayerIndex: startingPlayerIndex, // the stopper throws first each half
        turn: { darts: [], locked: false },
        isGameOver: false,
        winner: null,
        transition: null, // overlay text { title, subtitle } for a 'half' event
        targetSegments: [], // still-open numbers (excl. bull) for the LED ring
    };

    const otherIndex = (i) => (i + 1) % 2;

    function resetMarks() {
        // Rebuild for the current number set (sudden death swaps in a subset).
        state.marks = {};
        for (const n of state.numbers) {
            state.marks[n] = 0;
        }
    }

    // Sudden death plays on a fresh random 3 from the original set — a new 3 per
    // pair, so a second sudden death gets three different numbers.
    function suddenDeathNumbers() {
        const count = Math.min(3, state.baseNumbers.length);
        const chosen = new Set();
        while (chosen.size < count) {
            chosen.add(Math.floor(Math.random() * state.baseNumbers.length));
        }
        return state.baseNumbers.filter((_, i) => chosen.has(i));
    }

    const allClosed = () => state.numbers.every((n) => state.marks[n] >= 3);

    // Still-open numbers light the ring; bull has no ring LED so it's excluded.
    function refreshTargets() {
        state.targetSegments = state.numbers.filter((n) => n !== 'bull' && state.marks[n] < 3);
    }

    // Higher total wins; null on a tie.
    function determineWinner() {
        if (state.players[0].score === state.players[1].score) {
            return null;
        }
        return state.players[0].score > state.players[1].score ? 0 : 1;
    }

    // The half ends the instant the stopper shuts the last number, which only
    // ever happens on a dart — so the transition is driven from onDart, not
    // Next Player. The game advances its own state into the new phase here and
    // hands the controller a 'half' (or a terminal 'win'/'draw') to react to.
    function endHalf() {
        // Stash the turn as nextPlayer would, before rolling into the new phase.
        currentPlayer(state).lastDarts = state.turn.darts.slice();
        state.turn = { darts: [], locked: false };

        // Odd phase = first half of a pair → swap roles and play the second half.
        if (state.phase % 2 === 1) {
            state.phase++;
            state.round = state.phase;
            state.stopperIndex = otherIndex(state.stopperIndex);
            resetMarks();
            state.currentPlayerIndex = state.stopperIndex;
            refreshTargets();
            state.transition = { title: 'Half ' + state.phase, subtitle: 'Swap roles' };
            return { state, event: 'half', callouts: [] };
        }

        // Even phase completes a pair → decide the game.
        const winner = determineWinner();
        if (winner !== null) {
            state.isGameOver = true;
            state.winner = winner;
            return { state, event: 'win', callouts: [] };
        }
        // Tied. Either call it a draw, or play another pair on a fresh random 3
        // from the original set (sudden death) with roles swapped again.
        if (onDraw === 'draw') {
            state.isGameOver = true;
            state.winner = null;
            return { state, event: 'draw', callouts: [] };
        }
        state.phase++;
        state.round = state.phase;
        state.stopperIndex = otherIndex(state.stopperIndex);
        state.numbers = suddenDeathNumbers();
        resetMarks();
        state.currentPlayerIndex = state.stopperIndex;
        refreshTargets();
        state.transition = { title: 'Sudden death', subtitle: 'Swap roles' };
        return { state, event: 'half', callouts: [] };
    }

    // The scorer's running total belongs to the turn that just ended.
    const turnEnd = createTurnEndCallout();

    // End of the scorer's turn (last dart landed): call their running score now,
    // not on the switch. Only the scorer scores, so the stopper stays silent.
    function scorerTurnEnd(idx, isStopper) {
        if (isStopper || state.turn.darts.length < dartsPerTurn) {
            return [];
        }
        return [turnEnd.onTurnEnd(() => ({ type: 'remaining', value: state.players[idx].score }))];
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

        const idx = state.currentPlayerIndex;
        const isStopper = idx === state.stopperIndex;
        const hit = dartMarks(ring, segment, state.numbers);

        // Not a target number → nothing happens
        if (!hit) {
            state.turn.darts.push({ ring, segment, hit: false, points: 0 });
            return { state, event: 'miss', callouts: scorerTurnEnd(idx, isStopper) };
        }

        const { number, marks: hitMarks } = hit;
        const value = numberValue(number);

        if (isStopper) {
            // The stopper only closes numbers — extra marks are wasted.
            state.marks[number] = Math.min(3, state.marks[number] + hitMarks);
            state.turn.darts.push({ ring, segment, hit: true, number, marks: hitMarks, points: 0 });
            refreshTargets();
            // Last number just closed → the half ends on this dart. endHalf()
            // advances into the new phase (or ends the game) and returns the
            // event the controller reacts to.
            if (allClosed()) {
                return endHalf();
            }
            return { state, event: null, callouts: [] };
        }

        // The scorer earns the number's value per mark, but only while it's open.
        const open = state.marks[number] < 3;
        const points = open ? value * hitMarks : 0;
        state.players[idx].score += points;
        state.turn.darts.push({ ring, segment, hit: true, number, marks: hitMarks, points });
        refreshTargets();
        return { state, event: null, callouts: scorerTurnEnd(idx, false) };
    }

    // Pure rotation now: the half only ever ends on a closing dart (endHalf),
    // never via Next Player. Hand the darts to the other player.
    function nextPlayer() {
        const leavingIdx = state.currentPlayerIndex;
        currentPlayer(state).lastDarts = state.turn.darts.slice(); // keep visible until their next turn
        // The scorer's running total was called on their last dart; here it's only
        // the fallback for an undetected last dart. The stopper wasn't scoring, so
        // stays silent either way.
        const scoreCall = leavingIdx === state.stopperIndex
            ? null
            : turnEnd.onSwitch(() => ({ type: 'remaining', value: state.players[leavingIdx].score }));
        const callouts = scoreCall ? [scoreCall] : [];
        state.turn = { darts: [], locked: false };
        state.currentPlayerIndex = otherIndex(state.currentPlayerIndex);
        refreshTargets();
        return { state, event: 'switch', callouts };
    }

    function getCallouts() {
        return [];
    }

    // Big heads-up number: the scorer's running score. The stopper isn't scoring
    // this half, so their points stay off the board (the card still shows them).
    function getHeadline() {
        if (state.currentPlayerIndex === state.stopperIndex) {
            return '';
        }
        return String(currentPlayer(state).score);
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
        refreshTargets();
    }

    refreshTargets();

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
