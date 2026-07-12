// Bob's 27 — a doubles-accuracy drill. Everyone starts on 27. Each round targets
// one double in order (D1, D2, … D20, then the double bull). On a turn (3 darts)
// every dart on the round's double adds that double's value (D6 = +12, double
// bull = +50); miss the target with all three darts and that value is subtracted.
//
// Optional elimination: a player whose score drops to 0 or below is out — skipped
// for the rest of the game and can't win. With elimination off, scores may go
// negative and everyone plays the whole card. Highest total wins.

import { currentPlayer, createTurnEndCallout, SUDDEN_DEATH_CAP } from '../../game-engine/shared/game-helpers.js';

// Each entry is the DOUBLE of that number; 'bull' = the double bull.
const SEQUENCE = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 'bull'];

// Points a qualifying dart banks: a double's face value, or the bull it landed
// (double bull 50, outer bull 25 — the latter only counts when 'any' bull is on).
function pointsForDart(ring, target) {
    if (target === 'bull') {
        return ring === 'DBULL' ? 50 : 25;
    }
    return 2 * target;
}

// Value subtracted on a full miss: the double's value, or the bull that was
// required (50 for the double bull, 25 when any bull is allowed).
function missPenalty(target, bullMode) {
    if (target === 'bull') {
        return bullMode === 'any' ? 25 : 50;
    }
    return 2 * target;
}

// Does this dart hit the round's double? Only the double counts — it's a doubles
// game. The final bull is the double (50) by default, or any bull when allowed.
function qualifies(ring, segment, target, bullMode) {
    if (target === 'bull') {
        return bullMode === 'any' ? (ring === 'SBULL' || ring === 'DBULL') : ring === 'DBULL';
    }
    return ring === 'D' && segment === target;
}

export function createBobs27({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    elimination = true,
    bullMode = 'double',
    onDraw = 'draw',
    startingPlayerIndex = 0,
} = {}) {
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], score: 27, lastDarts: [], out: false });
    }

    // Round N targets the Nth double; past the sequence it's a double-bull-off.
    function targetFor(round) {
        return round <= SEQUENCE.length ? SEQUENCE[round - 1] : 'bull';
    }

    const state = {
        type: 'bobs-27',
        dartsPerTurn,
        options: { elimination, bullMode, onDraw },
        sequence: SEQUENCE,
        target: SEQUENCE[0],
        players,
        currentPlayerIndex: startingPlayerIndex, // rotates each leg in match play
        turn: { darts: [], locked: false, roundHits: 0 }, // roundHits = darts on target this turn
        round: 1,
        turnsThisRound: 0, // active players who've thrown the current round
        isGameOver: false,
        winner: null,
        targetSegments: [], // LED ring: [number] on a double round, [] on the bull round
    };

    // Light the target's segment on the board only for double rounds — the bull
    // round has no numbered segment to single out.
    function refreshTargets() {
        state.targetSegments = typeof state.target === 'number' ? [state.target] : [];
    }

    // The current target as a spoken number, or null on the bull round (no clean
    // number to say numbers-only). Doubles-only is implicit, so a bare "four"
    // means D4 — matching the lit segment.
    function targetCallout() {
        return typeof state.target === 'number' ? { type: 'target', value: state.target } : null;
    }

    function activeCount() {
        return state.players.filter((p) => !p.out).length;
    }

    // Highest score among still-active players; null on a tie (or if none active).
    function determineWinner() {
        let best = -Infinity;
        let bestIdx = null;
        let tie = false;
        for (let i = 0; i < state.players.length; i++) {
            if (state.players[i].out) {
                continue;
            }
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

    // The turn's result belongs to the turn that just ended.
    const turnEnd = createTurnEndCallout();

    // Resolve the current player's completed turn: a full miss subtracts the
    // target's value (hits banked per dart), and dropping to 0 or below is
    // elimination. Returns the round-end callout — the loss sting when they're
    // knocked out, otherwise their new total. Runs once per turn (last dart, or
    // switch fallback) via createTurnEndCallout, so the penalty can't double-apply.
    function resolveTurn() {
        const p = currentPlayer(state);
        if (state.turn.roundHits === 0) {
            p.score -= missPenalty(state.target, bullMode);
        }
        if (elimination && p.score <= 0) {
            p.out = true;
            return { type: 'eliminated' };
        }
        // With elimination off a score can sit below zero — the audio layer
        // refuses to speak negatives, so nothing is announced until it recovers.
        return { type: 'remaining', value: p.score };
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

        const hit = qualifies(ring, segment, state.target, bullMode);
        const points = hit ? pointsForDart(ring, state.target) : 0;
        if (hit) {
            state.turn.roundHits++;
            currentPlayer(state).score += points; // points bank per dart
        }
        state.turn.darts.push({ ring, segment, hit, points });

        // End of turn (last dart landed): resolve the penalty/elimination and
        // announce now, not on the switch.
        const callouts = [];
        if (state.turn.darts.length >= dartsPerTurn) {
            callouts.push(turnEnd.onTurnEnd(resolveTurn));
        }
        return { state, event: hit ? null : 'miss', callouts };
    }

    function nextPlayer() {
        const leaving = currentPlayer(state);

        // The turn was resolved on the last dart; here it's the fallback for an
        // undetected last dart. resolveTurn applies the penalty/elimination, so it
        // must run (for its side effects) before the win checks read the score.
        const endCall = turnEnd.onSwitch(resolveTurn);

        leaving.lastDarts = state.turn.darts.slice(); // keep visible until their next turn
        state.turn = { darts: [], locked: false, roundHits: 0 };

        const callouts = endCall ? [endCall] : [];

        state.turnsThisRound++;

        // End checks (in order):
        // Last player standing wins once everyone else has been eliminated.
        if (elimination && numPlayers > 1 && activeCount() <= 1) {
            const remaining = state.players.findIndex((p) => !p.out);
            state.winner = remaining === -1 ? null : remaining;
            state.isGameOver = true;
            state.targetSegments = [];
            return { state, event: state.winner !== null ? 'win' : 'draw', callouts: [] };
        }
        // Solo play: busting out ends the game (a practice run with no winner).
        if (elimination && numPlayers === 1 && state.players[0].out) {
            state.isGameOver = true;
            state.winner = null;
            state.targetSegments = [];
            return { state, event: 'draw', callouts: [] };
        }

        // Round advance — once every active player has thrown this round.
        if (state.turnsThisRound >= activeCount()) {
            state.round++;
            state.turnsThisRound = 0;
            if (state.round > SEQUENCE.length) {
                const winner = determineWinner();
                // End after the card unless it's a tie and we play until a winner
                // (sudden death — a double-bull-off, keep going) — up to the cap,
                // beyond which perfectly-matched players settle for a draw.
                const capped = state.round > SEQUENCE.length + SUDDEN_DEATH_CAP;
                if (winner !== null || onDraw === 'draw' || capped) {
                    state.isGameOver = true;
                    state.winner = winner;
                    state.targetSegments = [];
                    return { state, event: winner !== null ? 'win' : 'draw', callouts: [] };
                }
            }
        }

        // Advance to the next active player (skip anyone eliminated).
        do {
            state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        } while (state.players[state.currentPlayerIndex].out);

        state.target = targetFor(state.round);
        refreshTargets();
        // Announce the incoming player's target (see targetCallout).
        const targetCall = targetCallout();
        if (targetCall) {
            callouts.push(targetCall);
        }
        return { state, event: 'switch', callouts };
    }

    // Opening callout: the first player's target as a bare number (doubles-only
    // is implicit). Turn-end score callouts come from resolveTurn, on the last
    // dart — not here.
    function getCallouts() {
        const targetCall = targetCallout();
        return targetCall ? [targetCall] : [];
    }

    // Big heads-up label: the current target as a short board label — 'D6' for a
    // double, 'Bull' for the double bull.
    function getHeadline() {
        return state.target === 'bull' ? 'Bull' : `D${state.target}`;
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
