// AI opponent turn driver — paces an AI player's darts so you can watch, and
// owns the Next Player button's AI-facing states while it does.
//
// When the turn lands on an AI player (maybeRunTurn), its darts are thrown on
// a timer, each routed through the controller's injectEvent so audio / LEDs /
// log / undo / win handling behave exactly as for a human. Real input is
// ignored while it throws (isThrowing — the controller gates handleEvent on
// it). An undo landing on an AI's turn arms a countdown that resumes the AI at
// zero, so it isn't left frozen.

import { getGame, getPanel } from '../game-engine/core/manager.js';
import { GAME_LOGIC } from '../game-engine/core/games-logic.js';
import { settings } from '../state/settings.js';
import { aiLevelOf, currentMemberUuid } from '../state/players.js';
import { aiThrow } from './ai.js';

// type → meta, for the supportsAi gate.
const GAME_META = Object.fromEntries(GAME_LOGIC.map(({ type, meta }) => [type, meta]));

// Deps: getGameType/isPendingNextLeg read the controller's session state,
// injectEvent feeds a synthesized dart/button event back into its event sink,
// board renders the aim-marks debug overlay.
export function createAiDriver({ getGameType, isPendingNextLeg, injectEvent, board }) {
    let aiThrowing = false;
    let aiThrowTimer = null; // pending runAiDart timeout, so an AI turn can be cancelled
    let aiResumeTimer = null; // 1s-tick countdown armed when an undo lands on an AI turn
    let aiResumeSecondsLeft = 0;
    const AI_RESUME_SECONDS = 5;

    // Cancel any in-flight AI turn (stops the throw chain).
    function stopThrowing() {
        if (aiThrowTimer) {
            clearTimeout(aiThrowTimer);
            aiThrowTimer = null;
        }
        aiThrowing = false;
    }

    function clearResumeCountdown() {
        if (aiResumeTimer) {
            clearInterval(aiResumeTimer);
            aiResumeTimer = null;
        }
    }

    // The Next Player button is a three-state label: "Next Player" (a human is
    // up), "AI Playing" (the AI is throwing — disabled), or "AI Resuming in N
    // seconds" (an undo landed on an AI's turn — clickable to resume now, and it
    // auto-resumes at zero). Advancing only ever happens on a human's turn, so a
    // mistimed press can never skip a turn.
    function refreshNextButton() {
        const panel = getPanel();
        const game = getGame();
        if (!panel) {
            return;
        }
        const over = !game || game.getState().isGameOver;
        if (aiResumeTimer && !over) {
            const s = aiResumeSecondsLeft;
            panel.setAdvance(`AI Resuming in ${s} second${s === 1 ? '' : 's'}`, true);
        } else if (aiThrowing && !over) {
            panel.setAdvance('AI Playing', false);
        } else if (!isPendingNextLeg()) {
            panel.setAdvance('Next Player', !over);
        }
    }

    // After an undo lands on an AI's turn, count down and then resume the AI. A
    // further undo restarts it; pressing Next Player resumes immediately.
    function startResumeCountdown() {
        clearResumeCountdown();
        aiResumeSecondsLeft = AI_RESUME_SECONDS;
        refreshNextButton();
        aiResumeTimer = setInterval(() => {
            aiResumeSecondsLeft -= 1;
            if (aiResumeSecondsLeft <= 0) {
                clearResumeCountdown();
                maybeRunTurn();
            } else {
                refreshNextButton();
            }
        }, 1000);
    }

    function currentAiLevel() {
        const game = getGame();
        if (!game) {
            return null;
        }
        const state = game.getState();
        // In a claim-phase throw-off (Domination) the thrower is assignIndex, not
        // currentPlayerIndex.
        const idx = state.phase === 'assign' ? state.assignIndex : state.currentPlayerIndex;
        const uuid = currentMemberUuid(state, idx);
        return uuid ? aiLevelOf(uuid) : null;
    }

    function maybeRunTurn() {
        if (aiThrowing || isPendingNextLeg()) {
            return;
        }
        const meta = GAME_META[getGameType()];
        const game = getGame();
        if (!meta || !meta.supportsAi || !game || game.getState().isGameOver) {
            return;
        }
        if (currentAiLevel() === null) {
            return; // a human is up
        }
        clearResumeCountdown();
        aiThrowing = true;
        refreshNextButton();
        aiThrowTimer = setTimeout(runAiDart, settings().ai.throwMs);
    }

    // Throw one AI dart through the controller's event sink.
    function throwOne(state) {
        const dart = aiThrow(getGameType(), state, currentAiLevel());
        injectEvent({ type: 'hit', ring: dart.ring, segment: dart.segment, _ai: true, _aimTarget: dart.aimTarget });
        if (settings().debug.aiMarks && board.showAiThrow) {
            board.showAiThrow(dart.aim, dart.land);
        }
    }

    function runAiDart() {
        const game = getGame();
        if (!game) {
            stopThrowing();
            return;
        }
        const state = game.getState();
        if (state.isGameOver) {
            stopThrowing(); // the winning dart was already handled
            return;
        }
        // A human is now up — e.g. a claim advanced the throw-off past this AI.
        if (currentAiLevel() === null) {
            stopThrowing();
            refreshNextButton();
            return;
        }
        // Claim phase (Domination): keep throwing until a free number is landed;
        // the game advances the throw-off itself, so there's no Next Player press.
        if (state.phase === 'assign') {
            throwOne(state);
            aiThrowTimer = setTimeout(runAiDart, settings().ai.throwMs);
            return;
        }
        // Turn's over — all darts thrown, or the turn locked early (an X01 bust
        // leaves fewer darts but no more may be thrown). Advance the same way a
        // human would with the Next Player button.
        if (state.turn.locked || state.turn.darts.length >= state.dartsPerTurn) {
            stopThrowing(); // release before advancing (may chain to the next AI)
            injectEvent({ type: 'button', _ai: true });
            return;
        }
        throwOne(state);
        aiThrowTimer = setTimeout(runAiDart, settings().ai.throwMs);
    }

    return {
        isThrowing: () => aiThrowing,
        stopThrowing,
        clearResumeCountdown,
        startResumeCountdown,
        refreshNextButton,
        currentAiLevel,
        maybeRunTurn,
    };
}
