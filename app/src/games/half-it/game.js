// Half It — each round has a single target from a fixed sequence. On your turn
// (3 darts) any dart that hits the round's target adds its face value to your
// running total. The catch: miss the target with ALL three darts and your total
// is halved (rounded down). Highest total after the sequence wins.
//
// The sequence mixes plain numbers with ring targets: a number means "any ring
// on that segment", 'double' = any double, 'treble' = any treble, 'bull' = the
// bull. Rounds past the sequence (sudden death) are a bull-off.

import { currentPlayer, advancePlayerBase, createTurnEndCallout, ignoredDart, highestScoreWinner } from '../../game-engine/shared/game-helpers.js';
import { calcPoints } from '../../game-engine/shared/board-score.js';

const SEQUENCE = [20, 16, 'double', 17, 18, 'treble', 19, 20, 'bull'];

// Does this dart hit the round's target?
function qualifies(ring, segment, target) {
    if (target === 'double') {
        return ring === 'D' || ring === 'DBULL';
    }
    if (target === 'treble') {
        return ring === 'T';
    }
    if (target === 'bull') {
        return ring === 'SBULL' || ring === 'DBULL';
    }
    // a number: any ring on that segment
    return (ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T') && segment === target;
}

export function createHalfIt({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    startScore = 0,
    onDraw = 'draw',
    startingPlayerIndex = 0,
} = {}) {
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], score: startScore, lastDarts: [] });
    }

    // Round N targets the Nth entry; past the sequence it's a bull-off.
    function targetFor(round) {
        return round <= SEQUENCE.length ? SEQUENCE[round - 1] : 'bull';
    }

    const state = {
        type: 'half-it',
        dartsPerTurn,
        options: { startScore, onDraw },
        sequence: SEQUENCE,
        target: SEQUENCE[0],
        players,
        currentPlayerIndex: startingPlayerIndex, // rotates each leg in match play
        turn: { darts: [], locked: false, roundPoints: 0 }, // roundPoints = this turn's points on the target
        round: 1,
        isGameOver: false,
        winner: null,
        targetSegments: [], // LED ring: [number] on a number round, else []
    };

    // Light the target's segment on the board only for number rounds — ring
    // targets (double/treble/bull) span the whole board, so nothing to single out.
    function refreshTargets() {
        state.targetSegments = typeof state.target === 'number' ? [state.target] : [];
    }

    function determineWinner() {
        return highestScoreWinner(state.players);
    }

    // The halve + running total belong to the turn that just ended.
    const turnEnd = createTurnEndCallout();

    // Resolve the completed turn: miss the target with all three darts and the
    // running total is halved (rounded down). Returns the running-total callout.
    // Runs once — last dart, or switch fallback — so the halve can't double-apply.
    function resolveTurn() {
        const p = currentPlayer(state);
        if (state.turn.roundPoints === 0) {
            p.score = Math.floor(p.score / 2);
        }
        return { type: 'remaining', value: p.score };
    }

    function onDart(ring, segment) {
        const ignored = ignoredDart(state, dartsPerTurn);
        if (ignored) {
            return ignored;
        }

        const hit = qualifies(ring, segment, state.target);
        const points = hit ? calcPoints(ring, segment) : 0;
        if (hit) {
            state.turn.roundPoints += points;
            currentPlayer(state).score += points;
        }
        state.turn.darts.push({ ring, segment, hit, points });

        // End of turn (last dart landed): resolve the halve + call the running
        // total now, not on the switch.
        const callouts = [];
        if (state.turn.darts.length >= dartsPerTurn) {
            callouts.push(turnEnd.onTurnEnd(resolveTurn));
        }
        return { state, event: hit ? null : 'miss', callouts };
    }

    function nextPlayer() {
        // The halve + running total were resolved on the last dart; here it's the
        // fallback for an undetected last dart.
        const endCall = turnEnd.onSwitch(resolveTurn);

        // Rotate + bump the round; the sequence length is the round limit. The
        // extra turn field (roundPoints) is reset here — advancePlayerBase clears
        // only darts + locked.
        const event = advancePlayerBase(state, SEQUENCE.length, { determineWinner, onDraw });
        state.turn.roundPoints = 0;
        if (event) {
            state.targetSegments = [];
            return { state, event, callouts: [] };
        }

        state.target = targetFor(state.round);
        refreshTargets();
        // The incoming player's target — numbers only (see getCallouts).
        const callouts = endCall ? [endCall] : [];
        if (typeof state.target === 'number') {
            callouts.push({ type: 'target', value: state.target });
        }
        return { state, event: 'switch', callouts };
    }

    // Announce the round's target — but numbers only. The audio engine speaks
    // numbers (a non-English voice would mangle "double"), so the double/treble/
    // bull rounds stay silent.
    function getCallouts() {
        return typeof state.target === 'number' ? [{ type: 'target', value: state.target }] : [];
    }

    // Big heads-up label: the current target, kept short so it fits the board —
    // 'D'/'T' for any double/treble (the panel spells it out in full).
    function getHeadline() {
        if (state.target === 'double') {
            return 'D';
        }
        if (state.target === 'treble') {
            return 'T';
        }
        if (state.target === 'bull') {
            return 'Bull';
        }
        return String(state.target);
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
    }

    refreshTargets();
    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
