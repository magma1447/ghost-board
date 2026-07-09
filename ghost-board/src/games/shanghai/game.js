// Shanghai — each round targets one number in turn: round 1 aims at the 1,
// round 2 at the 2, and so on up to the round limit. Only the round's number
// scores: a single counts x1, a double x2, a treble x3. Highest total after
// the final round wins.
//
// "Shanghai" instant win (optional): hitting a single, a double AND a treble
// of the round's number within one turn wins outright, whatever the score.

import { currentPlayer, advancePlayerBase } from '../../game-engine/shared/game-helpers.js';

export function createShanghai({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    maxRounds = 7,
    shanghaiWin = true,
    onDraw = 'draw',
    startingPlayerIndex = 0,
} = {}) {
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], score: 0, lastDarts: [] });
    }

    // Round N targets the number N, capped at 20 — the board has no higher
    // number (only reachable if sudden death runs past a limit of 20).
    function targetForRound(round) {
        return Math.min(round, 20);
    }

    const state = {
        type: 'shanghai',
        dartsPerTurn,
        options: { maxRounds, shanghaiWin, onDraw },
        target: targetForRound(1),
        targetSegments: [targetForRound(1)], // lit on the board
        players,
        currentPlayerIndex: startingPlayerIndex, // rotates each leg in match play
        turn: { darts: [], locked: false },
        round: 1,
        isGameOver: false,
        winner: null,
    };

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

    // Points for a dart on the target: single x1, double x2, treble x3. A
    // non-target dart (or a bull, which can't match a 1-20 target) scores 0.
    function pointsFor(ring, segment) {
        if (segment !== state.target) {
            return 0;
        }
        if (ring === 'T') {
            return state.target * 3;
        }
        if (ring === 'D') {
            return state.target * 2;
        }
        if (ring === 'SO' || ring === 'SI') {
            return state.target;
        }
        return 0;
    }

    // Have a single, a double and a treble of the target all landed this turn?
    function isShanghai() {
        const onTarget = state.turn.darts.filter((d) => d.segment === state.target);
        const single = onTarget.some((d) => d.ring === 'SO' || d.ring === 'SI');
        const double = onTarget.some((d) => d.ring === 'D');
        const treble = onTarget.some((d) => d.ring === 'T');
        return single && double && treble;
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

        const points = pointsFor(ring, segment);
        const isHit = points > 0;
        if (isHit) {
            currentPlayer(state).score += points;
        }
        state.turn.darts.push({ ring, segment, hit: isHit, points });

        // Shanghai: single + double + treble of the number in one turn wins now.
        if (shanghaiWin && isHit && isShanghai()) {
            state.turn.locked = true;
            state.isGameOver = true;
            state.winner = state.currentPlayerIndex;
            state.targetSegments = [];
            return { state, event: 'win', callouts: [] };
        }

        return { state, event: isHit ? null : 'miss', callouts: [] };
    }

    function nextPlayer() {
        // Rotate + bump the round; at the limit, highest score wins (a tie is a
        // draw unless sudden death plays on — the target climbs, capped at 20).
        const event = advancePlayerBase(state, maxRounds, { determineWinner, onDraw });
        if (event) {
            state.targetSegments = [];
            return { state, event, callouts: [] };
        }

        state.target = targetForRound(state.round);
        state.targetSegments = [state.target];
        return { state, event: 'switch', callouts: [{ type: 'target', value: state.target }] };
    }

    // First player never gets a nextPlayer() call — announce the opening target.
    function getCallouts() {
        return state.isGameOver ? [] : [{ type: 'target', value: state.target }];
    }

    // Big heads-up number: the number to aim at this round.
    function getHeadline() {
        return String(state.target);
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
    }

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
