// All Fives — each turn, add your three darts; if the total is a multiple of 5
// you score total ÷ 5 "fives", otherwise nothing. Race to a target total.
//
// In the default exact-finish mode you must land the running total exactly on
// the target — overshooting busts the turn (it scores nothing). With Allow
// overshoot on, reaching or passing the target wins.
//
// Scoring is per TURN (the whole 3-dart total is what must divide by 5), so —
// like X01 — this can't use the shared per-dart score engine; it's its own module.

import { currentPlayer, advancePlayerBase, createTurnEndCallout } from '../../game-engine/shared/game-helpers.js';
import { calcPoints } from '../../ble/protocol.js';
import { ALL_SEGMENTS } from '../../board/segments.js';
import { roomLeft, neededSingle, saveNumbers, bestFive } from './strategy.js';

export function createAllFives({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    target = 51,
    allowOvershoot = false,
    bullMode = '25/50',
    startingPlayerIndex = 0,
} = {}) {
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], score: 0, visits: 0, lastDarts: [] });
    }

    const state = {
        type: 'all-fives',
        dartsPerTurn,
        options: { target, allowOvershoot, bullMode },
        players,
        currentPlayerIndex: startingPlayerIndex, // rotates each leg in match play
        turn: { darts: [], locked: false },
        round: 1,
        isGameOver: false,
        winner: null,
        targetSegments: [20], // LED guidance for the next dart (see updateTargets)
        warnSegments: [], // red warning when there's no safe aim left this turn
    };

    // The fives scored belong to the turn that just ended — spoken on the last
    // dart, or as a switch fallback if that dart went undetected.
    const turnEnd = createTurnEndCallout();

    function pointsFor(ring, segment) {
        // 50/50 bull mode: the single (outer) bull scores 50 instead of 25.
        if (bullMode === '50/50' && ring === 'SBULL') {
            return 50;
        }
        return calcPoints(ring, segment);
    }

    function turnRaw() {
        return state.turn.darts.reduce((sum, d) => sum + d.points, 0);
    }

    function turnFives() {
        const raw = turnRaw();
        return raw % 5 === 0 ? raw / 5 : 0;
    }

    // LED guidance for the NEXT dart, via the shared strategy (so the AI aims by
    // the same rules). It never points at a hit that overshoots the exact target;
    // when the turn is already bust-locked (the room is used up before the last
    // dart), it warns the whole board red instead of pointing anywhere.
    function updateTargets() {
        state.warnSegments = [];
        const thrown = state.turn.darts.length;
        if (thrown >= dartsPerTurn) {
            state.targetSegments = []; // turn over — nothing to aim at
            return;
        }
        const raw = turnRaw();
        const room = roomLeft(currentPlayer(state).score, raw, target, allowOvershoot);
        if (room <= 0) {
            // Any multiple-of-5 landing now overshoots — no good aim left this turn.
            state.targetSegments = [];
            state.warnSegments = ALL_SEGMENTS;
            return;
        }
        // A single that lands the total exactly on the target — finish in one dart.
        if (room <= 20) {
            state.targetSegments = [room];
            return;
        }
        const isLast = thrown === dartsPerTurn - 1;
        if (isLast && neededSingle(raw) !== 0) {
            state.targetSegments = saveNumbers(raw, room); // may be empty → dark
            return;
        }
        const five = bestFive(room); // biggest safe five (0 in a delicate finish)
        state.targetSegments = five ? [five.segment] : [];
    }

    // Apply the finished turn's fives to the player. Returns 'win' | 'bust' | 'ok'.
    function applyScore(player, fives) {
        if (fives === 0) {
            return 'ok'; // total wasn't a multiple of 5 — no score
        }
        const newScore = player.score + fives;
        if (allowOvershoot) {
            player.score = newScore;
            if (newScore >= target) {
                state.isGameOver = true;
                state.winner = state.currentPlayerIndex;
                return 'win';
            }
            return 'ok';
        }
        // Exact-finish mode
        if (newScore === target) {
            player.score = newScore;
            state.isGameOver = true;
            state.winner = state.currentPlayerIndex;
            return 'win';
        }
        if (newScore > target) {
            return 'bust'; // overshoot — the whole turn scores nothing
        }
        player.score = newScore;
        return 'ok';
    }

    function resolveTurn() {
        const player = currentPlayer(state);
        const fives = turnFives();
        const outcome = applyScore(player, fives);
        player.lastDarts = state.turn.darts.slice();
        player.visits++;
        state.turn.locked = true;
        return { outcome, fives };
    }

    function onDart(ring, segment) {
        // Dart didn't count (game over, or turn already complete/locked).
        if (state.isGameOver) {
            return { state, event: 'ignored', callouts: [] };
        }
        if (state.turn.locked || state.turn.darts.length >= dartsPerTurn) {
            return { state, event: 'ignored', callouts: [] };
        }

        const points = pointsFor(ring, segment);
        state.turn.darts.push({ ring, segment, points });

        // Not the last dart yet.
        if (state.turn.darts.length < dartsPerTurn) {
            // Win the moment the turn total lands on the target (exact) or reaches
            // it (overshoot mode) — you don't have to throw the rest of your darts.
            const player = currentPlayer(state);
            const fives = turnFives();
            const reached = allowOvershoot ? player.score + fives >= target : player.score + fives === target;
            if (fives > 0 && reached) {
                resolveTurn(); // applies the score and sets the win
                updateTargets();
                turnEnd.suppress();
                return { state, event: 'win', callouts: [] };
            }
            updateTargets();
            return { state, event: points > 0 ? null : 'miss', callouts: [] };
        }

        // Last dart — resolve the whole turn.
        const { outcome, fives } = resolveTurn();
        updateTargets();
        if (outcome === 'win') {
            turnEnd.suppress();
            return { state, event: 'win', callouts: [] };
        }
        if (outcome === 'bust') {
            turnEnd.suppress(); // overshoot — the bust sound stands in for a total
            return { state, event: 'bust', callouts: [] };
        }
        // Speak the fives scored (0 when the total wasn't a multiple of 5).
        const callouts = [turnEnd.onTurnEnd(() => ({ type: 'turnTotal', value: fives }))];
        return { state, event: null, callouts };
    }

    function nextPlayer() {
        const callouts = [];
        // Resolve a partial turn ended early by a manual switch (rare — normally
        // the third dart resolves it).
        if (!state.turn.locked && state.turn.darts.length > 0) {
            resolveTurn();
            if (state.isGameOver) {
                return { state, event: 'win', callouts };
            }
        }
        // Fallback fives call for an undetected last dart (or the early switch above).
        const totalCall = turnEnd.onSwitch(() => (state.turn.darts.length > 0
            ? { type: 'turnTotal', value: turnFives() }
            : null));
        if (totalCall) {
            callouts.push(totalCall);
        }

        state.turn = { darts: [], locked: false };
        const event = advancePlayerBase(state, null); // no round limit — ends on target
        if (event) {
            state.targetSegments = [];
            return { state, event, callouts };
        }
        updateTargets();
        callouts.push({ type: 'remaining', value: currentPlayer(state).score });
        return { state, event: 'switch', callouts };
    }

    function getCallouts() {
        return [];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
    }

    // Big heads-up number: the current player's score (fives earned so far).
    function getHeadline() {
        return String(currentPlayer(state).score);
    }

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
