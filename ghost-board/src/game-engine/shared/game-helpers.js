// Shared game-logic helpers used across multiple game modes.
//
// These factor out the turn/round mechanics and ring-matching rules that were
// previously copy-pasted into each game.js. Games still own their scoring and
// win conditions — only the common skeleton lives here.
//
// Every game.js follows the same lifecycle, so reading one prepares you for the
// next. The controller drives it; these helpers implement the shared stages:
//   • setup        — createXxx(options) builds state and returns the six methods
//                    { onDart, nextPlayer, getCallouts, getHeadline, getState,
//                    loadState }.
//   • round start  — getCallouts() (and the tail of nextPlayer) announce the
//                    incoming player's target/score (a 'target' / 'remaining'
//                    callout).
//   • read a dart  — onDart(ring, segment) scores the dart and, on the LAST dart,
//                    resolves the turn (createTurnEndCallout): any turn-end
//                    penalty plus the end-of-round callout.
//   • next player  — nextPlayer() rotates and, at the round limit, ends the leg
//                    (advancePlayerBase). It's also the fallback for a turn-end
//                    callout whose last dart went undetected.
//   • leg/game end — a 'win' / 'draw' event bubbles up to the controller + match
//                    layer.
// Games that skip eliminated players (Bob's 27, Killer) or swap roles mid-game
// (Scram, Cat and Mouse) own their advance; the rest share advancePlayerBase.

// The player whose turn it currently is.
export function currentPlayer(state) {
    return state.players[state.currentPlayerIndex];
}

// Dart didn't count (game over, or turn already complete/locked) — 'ignored'
// lets the UI skip audio while LEDs still flash. Returns the result to hand
// back from onDart(), or null when the dart counts and play proceeds.
export function ignoredDart(state, dartsPerTurn) {
    if (state.isGameOver || state.turn.locked || state.turn.darts.length >= dartsPerTurn) {
        return { state, event: 'ignored', callouts: [] };
    }
    return null;
}

// Highest score wins; a tie for the lead returns null (draw / sudden death).
// skip() excludes players from contention (e.g. eliminated in Bob's 27).
export function highestScoreWinner(players, { skip } = {}) {
    let best = -Infinity;
    let bestIdx = null;
    let tie = false;
    for (let i = 0; i < players.length; i++) {
        if (skip && skip(players[i])) {
            continue;
        }
        if (players[i].score > best) {
            best = players[i].score;
            bestIdx = i;
            tie = false;
        } else if (players[i].score === best) {
            tie = true;
        }
    }
    return tie ? null : bestIdx;
}

// End-of-turn stash: keep the leaving player's darts visible until their next
// turn, and reset the turn for whoever throws next. Games with their own
// player rotation call this instead of advancePlayerBase.
export function stashTurn(state) {
    currentPlayer(state).lastDarts = state.turn.darts;
    state.turn.darts = [];
    state.turn.locked = false;
}

// Does the dart's ring qualify as a hit under the given hit mode?
//   'doubles' — only the double ring
//   'trebles' — only the treble ring
//   'any'     — any ring on the segment (single in/out, double, treble)
export function ringMatchesMode(ring, hitMode) {
    if (hitMode === 'doubles') {
        return ring === 'D';
    }
    if (hitMode === 'trebles') {
        return ring === 'T';
    }
    return ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T';
}

// With multi-step enabled, doubles advance 2 targets and trebles advance 3.
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

// Common end-of-turn skeleton: stash the leaving player's darts, clear the turn,
// rotate to the next player, and bump the round on wrap. Past the round limit it
// resolves the outcome and returns 'win' / 'draw' (else null, to play on):
//   - no options → a plain draw at the limit (for games that decide a winner
//     mid-dart, like X01 and Around the Clock — they only need the draw fallback).
//   - { determineWinner, onDraw } → ask the game who leads: a winner ends it; a
//     tie ends as a draw unless onDraw keeps play going (sudden death → null).
// Games with extra turn state (Half It's roundPoints) reset those fields
// themselves — this clears only darts + locked.
// Sudden death plays on until someone leads, but perfectly-matched players (two
// flawless AIs, or a freak human tie) could tie forever — so cap the extra rounds
// and settle for a draw. Shared with games that run their own sudden death.
export const SUDDEN_DEATH_CAP = 100;

export function advancePlayerBase(state, maxRounds, { determineWinner, onDraw } = {}) {
    stashTurn(state);
    state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
    if (state.currentPlayerIndex === 0) {
        state.round++;
    }

    // Decide only at a round boundary (currentPlayerIndex wrapped to 0, so everyone
    // has thrown the same number of turns) — otherwise sudden death would hand it
    // to whoever throws first.
    if (maxRounds !== null && state.currentPlayerIndex === 0 && state.round > maxRounds) {
        const winner = determineWinner ? determineWinner() : null;
        const capped = state.round > maxRounds + SUDDEN_DEATH_CAP; // give up on an endless tie
        // No winner-finder → a plain draw. With one, a tie ends as a draw unless
        // the game plays on to break it (sudden death), up to the cap.
        if (winner !== null || !determineWinner || onDraw === 'draw' || capped) {
            state.isGameOver = true;
            state.winner = winner;
            return winner !== null ? 'win' : 'draw';
        }
    }
    return null;
}

// Runs a turn-end step exactly once — on the last dart, or, if that dart wasn't
// detected (an undetected out), as a fallback on the switch; never twice. The
// step is a thunk that returns the end-of-round callout (the outgoing player's
// result — turn total, running score, …), or null when there's nothing to say.
// The game supplies the thunk + any guards; this only owns the "when / once".
// suppress() covers busts/wins where the round ends with nothing to announce.
export function createTurnEndCallout() {
    let done = false;
    return {
        // Last dart of the turn: run the step and hand back its callout to push.
        onTurnEnd(step) {
            done = true;
            return step();
        },
        // On the switch: run the step only if it hasn't run yet (the fallback),
        // then reset for the next turn.
        onSwitch(step) {
            const callout = done ? null : step();
            done = false;
            return callout;
        },
        // Bust / win / early end: mark done so the switch doesn't run the step.
        suppress() {
            done = true;
        },
    };
}
