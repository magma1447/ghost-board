// Game session controller.
//
// Owns the game lifecycle (pick → setup → launch → play → end → restore) and
// the dart/button event handling that drives it. main.js builds the DOM and
// hardware, then hands the main-owned pieces (game area, board, headline HUD,
// log, win overlay, menu enable/disable) to createGameController() and wires
// the BLE/debug event stream to handleEvent(). The AI turn pacing lives in
// ai/ai-driver.js and the undo history in undo-stack.js; this coordinates
// them with the lifecycle and routes each game event to panel/audio/LEDs/log.

import { startGame, stopGame, getGame, getPanel } from './game-engine/core/manager.js';
import { saveGame, loadGame, clearGame } from './state/game-store.js';
import { settings } from './state/settings.js';
import { createPlayer, teamMembersOf, currentMemberUuid, reorderUuids } from './state/players.js';
import { createAiDriver } from './ai/ai-driver.js';
import { createUndoStack } from './undo-stack.js';
import { calcPoints } from './game-engine/shared/board-score.js';
import { onHit as ledHit, onSwitch as ledSwitch, allOff as ledsOff, attract as ledsAttract } from './led-controller.js';
import { showTargetLed } from './ble/target-led.js';
import { playHit, playSwitch, playBust, playWin, playSprint, playCorrect } from './audio/sounds.js';
import { processCallouts } from './audio/callouts.js';
import { confirmDialog } from './ui/common/confirm.js';
import { GAMES } from './game-engine/core/registry.js';
import { createGameSelector } from './game-engine/core/game-selector.js';
import {
    createMatchState, isMatchPlay, startingPlayerIndex, recordLegWin,
    advanceLeg, currentSetNumber, currentLegNumber, firstToWin,
} from './game-engine/core/match.js';
import { formatDart } from './game-engine/shared/format.js';

// type → label / setup-factory maps derived from the ordered registry, so the
// picker and setup flow stay a single source of truth. GAME_LABELS preserves
// registry order (its entries drive the picker), so games render gentlest-first.
const GAME_LABELS = Object.fromEntries(GAMES.map(({ type, label }) => [type, label]));
const GAME_SETUPS = Object.fromEntries(GAMES.map(({ type, createSetup }) => [type, createSetup]));

// Format a dart hit for the log (e.g. "T20 (60)", "D-Bull (50)", "Out")
function formatHit(hit) {
    if (hit.ring === 'OUT') {
        return 'Out';
    }
    if (hit.ring === 'DBULL') {
        return 'D-Bull (50)';
    }
    if (hit.ring === 'SBULL') {
        return 'Bull (25)';
    }
    const prefix = { D: 'D', T: 'T', SO: 'S', SI: 'S' }[hit.ring];
    const pts = calcPoints(hit.ring, hit.segment);
    return `${prefix}${hit.segment} (${pts})`;
}

// Player name + short UUID, for log readability with traceability
function playerLabel(player) {
    const name = createPlayer(player.uuid).getName();
    const shortId = player.uuid ? player.uuid.slice(0, 8) : '?';
    return `${name} (${shortId})`;
}

export function createGameController({ gameArea, board, headline, log, winDisplay, setMenuDisabled }) {
    // Current game type + options, persisted so a game can be restored on reload
    let currentGameType = null;
    let currentGameOpts = null;
    // Last round number logged, so we emit "Round X" only when it changes
    let lastLoggedRound = 0;
    // Match state (legs/sets) for the running game, null between games. The
    // Set/Leg position and per-player tallies are rendered inside the game panel
    // (passed as a 3rd arg to panel.update). pendingNextLeg means a leg just
    // ended and the advance button starts the next leg.
    let match = null;
    let pendingNextLeg = false;

    const undoHistory = createUndoStack();

    // AI turn pacing + the Next Player button's AI states (ai/ai-driver.js).
    // Its darts come back through handleEvent, flagged _ai.
    const aiDriver = createAiDriver({
        getGameType: () => currentGameType,
        isPendingNextLeg: () => pendingNextLeg,
        injectEvent: (event) => handleEvent(event),
        board,
    });

    function undo() {
        const game = getGame();
        if (!game || undoHistory.isEmpty()) {
            return;
        }
        aiDriver.stopThrowing(); // cancel any AI turn we're reverting through
        aiDriver.clearResumeCountdown();
        game.loadState(undoHistory.pop());
        const state = game.getState();
        board.clearHighlight(); // drop the reverted (false) hit's highlight
        getPanel().update(state, null, match);
        showTargetLed(state, 0); // restore the target LED for the reverted position
        headline.update(game);
        persistState();
        undoHistory.updateButton();
        log.logEvent('Undo', 'game');
        // Reverted onto an AI's turn? Arm the resume countdown so it isn't left
        // frozen; otherwise a human is up, so just reset the button.
        if (!state.isGameOver && aiDriver.currentAiLevel() !== null) {
            aiDriver.startResumeCountdown();
        } else {
            aiDriver.refreshNextButton();
        }
    }

    function persistState() {
        const game = getGame();
        if (game && currentGameType && currentGameOpts) {
            saveGame({ type: currentGameType, options: currentGameOpts, state: game.getState(), match });
        }
    }

    // Re-render the panel for the current game with the latest match state, so
    // the Set/Leg position and per-player legs/sets refresh.
    function refreshPanel(event = null) {
        const game = getGame();
        if (game) {
            getPanel().update(game.getState(), event, match);
        }
    }

    // Log a round change once per round (skips finished games)
    function logRound(state) {
        if (!state || state.isGameOver || state.round === lastLoggedRound) {
            return;
        }
        lastLoggedRound = state.round;
        log.logEvent(`Round ${state.round}`, 'game');
    }

    // Reveal the panel's Rematch button (shown once a game/match is over)
    function showRematch() {
        const panel = getPanel();
        if (panel) {
            panel.showRematch();
        }
    }

    // Replay the same game/match with the same players and settings. `op`
    // (from the Rematch menu) reorders the player list — keep/rotate/reverse/
    // swap/randomize — and play restarts from the top of the new order. The
    // reordered list is persisted into currentGameOpts, so the next rematch
    // builds on it (repeated 'rotate' keeps rotating).
    function rematch(op = 'rotate') {
        if (!currentGameType || !currentGameOpts) {
            return;
        }
        const uuids = currentGameOpts.playerUuids || [];
        currentGameOpts = { ...currentGameOpts, playerUuids: reorderUuids(uuids, op) };
        winDisplay.hide();
        launchGame(currentGameType, currentGameOpts, false);
        const game = getGame();
        if (game) {
            showTargetLed(game.getState(), 500);
            processCallouts(game.getCallouts());
            logRound(game.getState());
        }
    }

    // Announce a win/draw outcome: log it and show the full-screen overlay
    // (no-op for other events). 'half' is the general mid-game phase/role
    // transition: the game has already advanced into the new phase and stashed
    // the overlay text in state.transition, so we just surface it — the swap is
    // auto-advanced by the caller, there's no Next Player press.
    function handleGameOutcome(state, gameEvent) {
        if (gameEvent === 'win') {
            const name = createPlayer(state.players[state.winner].uuid).getName();
            log.logEvent(`${name} wins`, 'game');
            winDisplay.showWin(name);
            showRematch();
        } else if (gameEvent === 'draw') {
            log.logEvent('Draw', 'game');
            winDisplay.showDraw();
            showRematch();
        } else if (gameEvent === 'half') {
            const transition = state.transition || {};
            log.logEvent(transition.title || 'New phase', 'game');
            winDisplay.showTransition(transition.title || '', transition.subtitle || '');
        }
    }

    // Arm the (now-disabled) Next Player button to start the next leg, labeled
    // for whether a leg or a set was just won.
    function armNextLeg(level) {
        pendingNextLeg = true;
        getPanel().setAdvance(level === 'set' ? 'Next set · leg 1' : 'Next leg →', true);
    }

    // A leg was won during match play. Record it against the winning player
    // (by uuid, so it's stable even when Cat and Mouse swaps roles), update the
    // bar, and either end the match (full overlay) or arm the advance button for
    // the next leg.
    function handleMatchWin(state) {
        const winnerUuid = state.players[state.winner].uuid;
        const winnerIndex = currentGameOpts.playerUuids.indexOf(winnerUuid);
        const winnerName = createPlayer(winnerUuid).getName();
        const outcome = recordLegWin(match, winnerIndex);
        refreshPanel(); // re-render with updated tallies / position
        persistState();

        if (outcome.level === 'match') {
            log.logEvent(`${winnerName} wins the match`, 'game');
            winDisplay.showWin(winnerName); // full gold overlay
            showRematch();
            return;
        }

        const what = outcome.level; // 'leg' | 'set'
        log.logEvent(`${winnerName} wins the ${what} — legs ${match.legsWon.join('–')}, sets ${match.setsWon.join('–')}`, 'game');
        winDisplay.showLegWin(winnerName, what); // big overlay, discreet colour
        armNextLeg(what);
    }

    function handleNextPlayer() {
        if (aiDriver.isThrowing()) {
            return; // ignore a manual advance while the AI is mid-turn
        }
        // Paused into an *unfinished* AI turn (an undo landed here, or a human
        // pressed the button while it's the AI's turn): resume the AI rather than
        // advancing. A finished AI turn — its own end-of-turn advance — falls
        // through to the switch, so a turn only ever advances on a human's turn or
        // when the AI is genuinely done, and a mistimed press can't skip anyone.
        const g = getGame();
        const gs = g && g.getState();
        // A locked turn is finished, not unfinished — a bust locks the turn with
        // fewer than dartsPerTurn darts, and without this it would look resumable
        // and the AI would loop (resume → hit the locked turn → resume → …).
        const aiTurnUnfinished = gs && !gs.isGameOver && aiDriver.currentAiLevel() !== null
            && !gs.turn.locked && gs.turn.darts.length < gs.dartsPerTurn;
        if (aiTurnUnfinished) {
            aiDriver.maybeRunTurn();
            return;
        }
        // During match play, after a leg ends the advance button starts the next leg.
        if (pendingNextLeg) {
            startNextLeg();
            return;
        }
        const game = getGame();
        if (!game) {
            return;
        }
        undoHistory.push(); // allow undoing the switch (rolls back the turn)
        playSwitch();
        ledSwitch();
        board.clearHighlight(); // don't carry the previous player's last hit over
        // The leaving team advances to its next member for its next turn. The
        // snapshot above captured the pre-advance value, so undo rolls it back.
        const leavingState = game.getState();
        const leavingUuid = leavingState.players[leavingState.currentPlayerIndex].uuid;
        if (leavingState.teamTurns && leavingUuid in leavingState.teamTurns) {
            leavingState.teamTurns[leavingUuid] += 1;
        }
        const { state, event, callouts } = game.nextPlayer();
        // In match play a win (e.g. Cat and Mouse at the round limit) ends a leg,
        // not the whole match — suppress the generic banner and route it to the
        // match handler instead.
        const matchWin = event === 'win' && isMatchPlay(match);
        getPanel().update(state, matchWin ? null : event, match);
        processCallouts(callouts);
        showTargetLed(state, 1000);
        persistState();

        logRound(state);
        if (event === 'switch') {
            const idx = state.currentPlayerIndex;
            const memberUuid = currentMemberUuid(state, idx);
            const memberNote = memberUuid !== state.players[idx].uuid
                ? ` · ${createPlayer(memberUuid).getName()}` : '';
            log.logEvent(`Player: ${playerLabel(state.players[idx])}${memberNote}`, 'player');
        } else if (matchWin) {
            handleMatchWin(state);
        } else {
            handleGameOutcome(state, event);
        }
        headline.update(game);
        undoHistory.updateButton();
        aiDriver.refreshNextButton();
        aiDriver.maybeRunTurn();
    }

    function handleEndGame() {
        aiDriver.stopThrowing(); // cancel any in-flight AI turn
        aiDriver.clearResumeCountdown();
        stopGame();
        clearGame();
        ledsAttract();
        board.clearHighlight(); // don't leave the last hit lit after the game ends
        currentGameType = null;
        currentGameOpts = null;
        match = null;
        pendingNextLeg = false;
        undoHistory.clear();
        log.logEvent('Game ended', 'game');
        headline.update(null);
        winDisplay.hide();
        setMenuDisabled(false);
    }

    // End Game button: confirm first while play is still in progress (an
    // accidental press would wipe it). Skip the prompt only when nothing is
    // running. In match play a finished leg leaves the game gameOver while the
    // match continues (pendingNextLeg) — that still needs confirming.
    function requestEndGame() {
        const game = getGame();
        const inProgress = game && (!game.getState().isGameOver || pendingNextLeg);
        if (!inProgress) {
            endGameAndReopenSetup();
            return;
        }
        confirmDialog({
            message: 'End the current game?',
            confirmLabel: 'End Game',
            onConfirm: endGameAndReopenSetup,
        });
    }

    // Create (or recreate, for a new leg) the game instance for the current
    // type/opts with the given starting player. Shared by launchGame and
    // startNextLeg. startGame() destroys the previous panel and renders the
    // fresh one; refreshPanel() then layers in the current match display.
    function startGameInstance(startIndex) {
        ledsOff();
        board.clearHighlight(); // start each game/leg with no stale highlight
        undoHistory.clear(); // undo is scoped to the current leg
        // opts carries numPlayers + playerUuids from the setup panel's roster
        startGame(currentGameType, { ...currentGameOpts, startingPlayerIndex: startIndex }, gameArea, {
            onNextPlayer: handleNextPlayer,
            onEndGame: requestEndGame,
            onRematch: (op) => rematch(op),
            onUndo: undo,
        });
        // Seed per-leg team member-rotation counters on the fresh state — each
        // team-turn advances its counter, and the member up is members[n % len].
        // A restore overlays the saved counters via loadState right afterwards.
        const freshState = getGame().getState();
        freshState.teamTurns = {};
        for (const p of freshState.players) {
            if (teamMembersOf(p.uuid)) {
                freshState.teamTurns[p.uuid] = 0;
            }
        }
        refreshPanel();
        headline.update(getGame());
        winDisplay.hide();
        aiDriver.maybeRunTurn(); // if the opening player is an AI, let it throw
    }

    function launchGame(type, opts, resumed = false) {
        currentGameType = type;
        currentGameOpts = opts;
        lastLoggedRound = 0;
        pendingNextLeg = false;
        // Best-of 1/1 = single game; the match layer stays inactive.
        match = createMatchState(opts.legsBestOf || 1, opts.setsBestOf || 1, opts.playerUuids || []);
        startGameInstance(startingPlayerIndex(match));

        const names = (opts.playerUuids || []).map((uuid) => createPlayer(uuid).getName());
        const who = names.length > 0 ? ` · ${names.join(', ')}` : '';
        log.logEvent(`Game ${resumed ? 'resumed' : 'started'} — ${GAME_LABELS[type] || type}${who}`, 'game');
        setMenuDisabled(true);
    }

    // Start the next leg after a leg/set win: rotate the starter and recreate
    // the game. A fresh panel is built, so its Next Player button resets.
    function startNextLeg() {
        pendingNextLeg = false;
        advanceLeg(match);
        startGameInstance(startingPlayerIndex(match));
        const game = getGame();
        if (game) {
            lastLoggedRound = 0;
            showTargetLed(game.getState(), 500);
            processCallouts(game.getCallouts());
            log.logEvent(`Leg ${currentLegNumber(match)} — set ${currentSetNumber(match)}`, 'game');
            logRound(game.getState());
        }
    }

    // Open a game's setup screen — from the picker, or after End Game (#65).
    // Back from the setup returns to the game picker.
    function showGameSetup(type) {
        GAME_SETUPS[type](gameArea, (opts) => {
            clearGame();
            launchGame(type, opts);
            const game = getGame();
            if (game) {
                showTargetLed(game.getState(), 500);
                processCallouts(game.getCallouts());
                logRound(game.getState());
            }
        }, () => {
            showGamePicker(); // Back from setup → the game picker
        });
    }

    // End Game button: end the game, then land on the same game's setup for a
    // quick "play again / tweak options" — one step, not home + New Game + pick.
    function endGameAndReopenSetup() {
        const type = currentGameType;
        handleEndGame();
        if (type && GAME_SETUPS[type]) {
            showGameSetup(type);
        }
    }

    function showGamePicker() {
        const selector = createGameSelector(gameArea, {
            onPick: (type) => {
                selector.destroy();
                showGameSetup(type);
            },
            // Cancel → back to the home screen
            onCancel: () => {
                selector.destroy();
            },
        });
    }

    // New Game from the persistent menu: abandon any active game / in-flight
    // picker/setup, clear the area, then show the picker.
    function startNewGame() {
        if (getGame()) {
            handleEndGame();
        }
        gameArea.innerHTML = '';
        showGamePicker();
    }

    // Restore a saved game on load, if one exists.
    function restore() {
        const savedGameData = loadGame();
        if (savedGameData && GAME_SETUPS[savedGameData.type]) {
            launchGame(savedGameData.type, savedGameData.options, true);
            // Overlay the saved progress onto the freshly-built match (which
            // already has playerUuids / best-of from the options). Older saves
            // may lack some fields, so copy defensively.
            const savedMatch = savedGameData.match;
            if (savedMatch) {
                if (savedMatch.legsWon) {
                    match.legsWon = savedMatch.legsWon;
                }
                if (savedMatch.setsWon) {
                    match.setsWon = savedMatch.setsWon;
                }
                if (savedMatch.legNumber) {
                    match.legNumber = savedMatch.legNumber;
                }
                if (savedMatch.legResults) {
                    match.legResults = savedMatch.legResults;
                }
            }
            const game = getGame();
            if (game) {
                game.loadState(savedGameData.state);
                const state = game.getState();
                const panel = getPanel();
                panel.update(state, null, match);
                showTargetLed(state, 500);
                logRound(state);
                headline.update(game);
                // If a leg ended mid-match before "Next leg" was pressed, re-arm
                // the advance button (and re-show the result banner) so play can
                // continue after a reload. If the game/match is fully over,
                // offer a rematch instead.
                if (state.isGameOver) {
                    if (isMatchPlay(match)) {
                        const matchOver = match.setsWon.some((s) => s >= firstToWin(match.setsBestOf));
                        if (matchOver) {
                            showRematch();
                        } else {
                            const level = currentLegNumber(match) === 1 ? 'set' : 'leg';
                            const winnerName = createPlayer(state.players[state.winner].uuid).getName();
                            winDisplay.showLegWin(winnerName, level);
                            armNextLeg(level);
                        }
                    } else {
                        showRematch();
                    }
                }
            }
        } else {
            // Nothing to restore — sit in idle attract mode (board + SVG).
            ledsAttract();
        }
    }

    // BLE / debug event sink: a board hit or the physical button.
    function handleEvent(event) {
        // Ignore real input while the AI is mid-turn (its own darts carry _ai).
        if (aiDriver.isThrowing() && !event._ai) {
            return;
        }
        if (event.type === 'hit') {
            board.highlight(event.ring, event.segment);
            ledHit(event.ring, event.segment);

            // Forward to active game — decide sound based on game result
            const game = getGame();
            const panel = getPanel();
            if (game && panel) {
                const undoSnap = undoHistory.snapshot(); // capture state before the dart mutates it
                const { state, event: gameEvent, callouts, hitLevel } = game.onDart(event.ring, event.segment);
                // In match play a win ends a leg, not the match — suppress the
                // generic "wins!" banner so handleMatchWin can show leg/set text.
                const matchWin = gameEvent === 'win' && isMatchPlay(match);
                panel.update(state, matchWin ? null : gameEvent, match);
                aiDriver.refreshNextButton(); // keep the AI/human button label + state in step
                // 'ignored' = dart didn't count (turn complete/locked or game over):
                // stay silent so it doesn't sound like progress, and mark it in the
                // log. LEDs + board highlight still fire; audio follows game logic.
                const ignored = gameEvent === 'ignored';
                // A general phase/role transition happened on this dart (the
                // game already advanced into the new phase). Auto-advance: cover
                // the swap with the transition overlay and hand off exactly like
                // a Next Player switch — switch sound, switch LEDs, drop the
                // closing dart's highlight. No pending button, no press.
                const half = gameEvent === 'half';
                // AI darts note their intended aim when the aim-marks debug is on.
                const aimNote = event._aimTarget && settings().debug.aiMarks
                    ? ` — aimed ${formatDart(event._aimTarget)}`
                    : '';
                log.logEvent(`${formatHit(event)}${ignored ? ' (ignored)' : ''}${aimNote}`, 'hit');
                if (ignored) {
                    // no audio
                } else if (half) {
                    playSwitch();
                    ledSwitch();
                    board.clearHighlight();
                } else if (gameEvent === 'bust' || gameEvent === 'miss') {
                    playBust();
                    // A miss can still be a turn's last dart, carrying its
                    // end-of-turn callout (e.g. the running total) — play it after
                    // the thud. Busts carry none, so this is a no-op there.
                    processCallouts(callouts);
                } else if (gameEvent === 'win') {
                    playWin();
                } else if (gameEvent === 'sprint') {
                    // Perfect set in Cat and Mouse — earned another three darts
                    playSprint();
                    log.logEvent('Sprint — three more darts', 'game');
                    processCallouts(callouts); // the target for the bonus darts
                } else if (gameEvent === 'correct') {
                    // Hit a called/round target (Simon Says, Shanghai) — a distinct,
                    // audible confirmation, scaled by the hit's multiple (hitLevel),
                    // instead of the easy-to-miss single-ring tone.
                    playCorrect(hitLevel);
                    processCallouts(callouts);
                } else {
                    playHit(event.ring);
                    processCallouts(callouts);
                }
                showTargetLed(state, 800);
                // Throw-for (Killer assign phase) shows taken numbers on the ring
                // only — no lingering cell highlight carried into the next thrower.
                if (state.phase === 'assign') {
                    board.clearHighlight();
                }
                persistState();
                // The transition rolls into a new phase (fresh marks / swapped
                // roles) — a clean boundary, so undo doesn't reach back across
                // it: clear the stack rather than record the closing dart.
                if (half) {
                    undoHistory.clear();
                } else if (!ignored) {
                    undoHistory.push(undoSnap); // the dart counted — it can be undone
                }
                if (matchWin) {
                    handleMatchWin(state);
                } else {
                    handleGameOutcome(state, gameEvent);
                }
                if (gameEvent === 'sprint') {
                    headline.flash('SPRINT', 1500);
                } else {
                    headline.update(game);
                }
                undoHistory.updateButton();
            } else {
                log.logEvent(formatHit(event), 'hit');
                playHit(event.ring);
            }
        }

        if (event.type === 'button') {
            handleNextPlayer();
        }
    }

    return { handleEvent, startNewGame, restore };
}
