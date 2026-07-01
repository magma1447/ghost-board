// Game session controller.
//
// Owns the game lifecycle (pick → setup → launch → play → end → restore) and
// the dart/button event handling that drives it. main.js builds the DOM and
// hardware, then hands the main-owned pieces (game area, board, headline HUD,
// log, win overlay, menu enable/disable) to createGameController() and wires
// the BLE/debug event stream to handleEvent().

import { startGame, stopGame, getGame, getPanel } from './games/manager.js';
import { saveGame, loadGame, clearGame } from './state/game-store.js';
import { createPlayer } from './state/players.js';
import { calcPoints } from './ble/protocol.js';
import { onHit as ledHit, onSwitch as ledSwitch, allOff as ledsOff, allOn as ledsOn } from './led-controller.js';
import { showTargetLed } from './ble/target-led.js';
import { playHit, playSwitch, playBust, playWin, playSprint } from './audio/sounds.js';
import { processCallouts } from './audio/callouts.js';
import { confirmDialog } from './ui/common/confirm.js';
import { createX01Setup } from './games/x01/setup.js';
import { createAroundTheClockSetup } from './games/around-the-clock/setup.js';
import { createCatAndMouseSetup } from './games/cat-and-mouse/setup.js';
import { createSimonSaysSetup } from './games/simon-says/setup.js';
import { createCountUpSetup } from './games/count-up/setup.js';
import { createScoreRushSetup } from './games/score-rush/setup.js';
import { createCricketSetup } from './games/cricket/setup.js';
import { meta as x01Meta } from './games/x01/meta.js';
import { meta as aroundTheClockMeta } from './games/around-the-clock/meta.js';
import { meta as catAndMouseMeta } from './games/cat-and-mouse/meta.js';
import { meta as simonSaysMeta } from './games/simon-says/meta.js';
import { meta as countUpMeta } from './games/count-up/meta.js';
import { meta as scoreRushMeta } from './games/score-rush/meta.js';
import { meta as cricketMeta } from './games/cricket/meta.js';
import {
    createMatchState, isMatchPlay, startingPlayerIndex, recordLegWin,
    advanceLeg, currentSetNumber, currentLegNumber, firstToWin,
} from './games/match.js';

const GAME_LABELS = {
    x01: 'X01',
    'around-the-clock': 'Around the Clock',
    'cat-and-mouse': 'Cat and Mouse',
    'simon-says': 'Simon Says',
    'count-up': 'Count Up',
    'score-rush': 'Score Rush',
    cricket: 'Cricket',
};

const GAME_SETUPS = {
    x01: createX01Setup,
    'around-the-clock': createAroundTheClockSetup,
    'cat-and-mouse': createCatAndMouseSetup,
    'simon-says': createSimonSaysSetup,
    'count-up': createCountUpSetup,
    'score-rush': createScoreRushSetup,
    cricket: createCricketSetup,
};

// Per-game short descriptions for the picker hover title.
const GAME_META = {
    x01: x01Meta,
    'around-the-clock': aroundTheClockMeta,
    'cat-and-mouse': catAndMouseMeta,
    'simon-says': simonSaysMeta,
    'count-up': countUpMeta,
    'score-rush': scoreRushMeta,
    cricket: cricketMeta,
};

// Format a dart hit for the log (e.g. "T20 (60)", "D-Bull (50)", "Miss")
function formatHit(hit) {
    if (hit.ring === 'OUT') {
        return 'Miss';
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
    // Rotates the starting player on each rematch (reset on a fresh New Game).
    let rematchOffset = 0;
    // Undo: deep-cloned game-state snapshots taken before each counting dart and
    // each player switch. Scoped to the current leg (cleared on new game/leg).
    const undoStack = [];

    function snapshotForUndo() {
        return JSON.parse(JSON.stringify(getGame().getState()));
    }

    // Undo is offered only for the simple cases: something on the stack and the
    // game/leg not yet over (the leg/game-ending dart and cross-leg undo are out
    // of scope and stay disabled).
    function updateUndoButton() {
        const panel = getPanel();
        const game = getGame();
        if (panel && panel.undoBtn) {
            panel.undoBtn.disabled = !(undoStack.length > 0 && game && !game.getState().isGameOver);
        }
    }

    function undo() {
        const game = getGame();
        if (!game || undoStack.length === 0) {
            return;
        }
        game.loadState(undoStack.pop());
        const state = game.getState();
        board.clearHighlight(); // drop the reverted (false) hit's highlight
        getPanel().update(state, null, match);
        showTargetLed(state, 0); // restore the target LED for the reverted position
        headline.update();
        persistState();
        updateUndoButton();
        log.logEvent('Undo', 'game');
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
        if (panel && panel.rematchBtn) {
            panel.rematchBtn.hidden = false;
        }
    }

    // Replay the same game/match with the same players and settings, rotating
    // who throws first. currentGameType/Opts are still set at game-over.
    function rematch() {
        if (!currentGameType || !currentGameOpts) {
            return;
        }
        const numPlayers = (currentGameOpts.playerUuids || []).length || 1;
        rematchOffset = (rematchOffset + 1) % numPlayers;
        winDisplay.hide();
        launchGame(currentGameType, currentGameOpts, false, rematchOffset);
        const game = getGame();
        if (game) {
            showTargetLed(game.getState(), 500);
            processCallouts(game.getCallouts());
            logRound(game.getState());
        }
    }

    // Announce a win/draw outcome: log it and show the full-screen overlay
    // (no-op for other events)
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
        }
    }

    // Arm the (now-disabled) Next Player button to start the next leg, labeled
    // for whether a leg or a set was just won.
    function armNextLeg(level) {
        const panel = getPanel();
        pendingNextLeg = true;
        panel.nextBtn.disabled = false;
        panel.nextBtn.textContent = level === 'set' ? 'Next set · leg 1' : 'Next leg →';
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
        // During match play, after a leg ends the advance button starts the next leg.
        if (pendingNextLeg) {
            startNextLeg();
            return;
        }
        const game = getGame();
        if (!game) {
            return;
        }
        undoStack.push(snapshotForUndo()); // allow undoing the switch (rolls back the turn)
        playSwitch();
        ledSwitch();
        board.clearHighlight(); // don't carry the previous player's last hit over
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
            log.logEvent(`Player: ${playerLabel(state.players[state.currentPlayerIndex])}`, 'player');
        } else if (matchWin) {
            handleMatchWin(state);
        } else {
            handleGameOutcome(state, event);
        }
        headline.update();
        updateUndoButton();
    }

    function handleEndGame() {
        stopGame();
        clearGame();
        ledsOn();
        board.clearHighlight(); // don't leave the last hit lit after the game ends
        currentGameType = null;
        currentGameOpts = null;
        match = null;
        pendingNextLeg = false;
        undoStack.length = 0;
        log.logEvent('Game ended', 'game');
        headline.update();
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
            handleEndGame();
            return;
        }
        confirmDialog({
            message: 'End the current game?',
            confirmLabel: 'End Game',
            onConfirm: handleEndGame,
        });
    }

    // Create (or recreate, for a new leg) the game instance for the current
    // type/opts with the given starting player. Shared by launchGame and
    // startNextLeg. startGame() destroys the previous panel and renders the
    // fresh one; refreshPanel() then layers in the current match display.
    function startGameInstance(startIndex) {
        ledsOff();
        board.clearHighlight(); // start each game/leg with no stale highlight
        undoStack.length = 0; // undo is scoped to the current leg
        // opts carries numPlayers + playerUuids from the setup panel's roster
        startGame(currentGameType, { ...currentGameOpts, startingPlayerIndex: startIndex }, gameArea, {
            onNextPlayer: handleNextPlayer,
            onEndGame: requestEndGame,
            onRematch: rematch,
            onUndo: undo,
        });
        refreshPanel();
        headline.update();
        winDisplay.hide();
    }

    function launchGame(type, opts, resumed = false, startOffset = 0) {
        currentGameType = type;
        currentGameOpts = opts;
        lastLoggedRound = 0;
        pendingNextLeg = false;
        // Best-of 1/1 = single game; the match layer stays inactive.
        match = createMatchState(opts.legsBestOf || 1, opts.setsBestOf || 1, opts.playerUuids || []);
        // Rotate the first leg's starter on a rematch (legNumber only drives
        // rotation; the displayed leg/set numbers come from legs/setsWon).
        match.legNumber = 1 + startOffset;
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

    function showGamePicker() {
        const picker = document.createElement('div');
        picker.className = 'game-picker';

        const gamesRow = document.createElement('div');
        gamesRow.className = 'game-picker-row';
        picker.appendChild(gamesRow);

        for (const [type, label] of Object.entries(GAME_LABELS)) {
            const btn = document.createElement('button');
            btn.className = 'btn btn-block';
            btn.textContent = label;
            if (GAME_META[type]) {
                btn.title = GAME_META[type].short;
            }
            btn.addEventListener('click', () => {
                picker.remove();
                GAME_SETUPS[type](gameArea, (opts) => {
                    clearGame();
                    rematchOffset = 0; // fresh game — restart the rotation
                    launchGame(type, opts);
                    const game = getGame();
                    if (game) {
                        showTargetLed(game.getState(), 500);
                        processCallouts(game.getCallouts());
                        logRound(game.getState());
                    }
                }, () => {
                    // Back from setup → return to the game picker
                    showGamePicker();
                });
            });
            gamesRow.appendChild(btn);
        }

        // Cancel → back to the home screen
        const cancelBtn = document.createElement('button');
        cancelBtn.className = 'btn btn-small btn-danger game-picker-cancel';
        cancelBtn.textContent = 'Cancel';
        cancelBtn.addEventListener('click', () => {
            picker.remove();
        });
        picker.appendChild(cancelBtn);

        gameArea.appendChild(picker);
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
                headline.update();
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
        }
    }

    // BLE / debug event sink: a board hit or the physical button.
    function handleEvent(event) {
        if (event.type === 'hit') {
            board.highlight(event.ring, event.segment);
            ledHit(event.ring, event.segment);

            // Forward to active game — decide sound based on game result
            const game = getGame();
            const panel = getPanel();
            if (game && panel) {
                const undoSnap = snapshotForUndo(); // capture state before the dart mutates it
                const { state, event: gameEvent, callouts } = game.onDart(event.ring, event.segment);
                // In match play a win ends a leg, not the match — suppress the
                // generic "wins!" banner so handleMatchWin can show leg/set text.
                const matchWin = gameEvent === 'win' && isMatchPlay(match);
                panel.update(state, matchWin ? null : gameEvent, match);
                // 'ignored' = dart didn't count (turn complete/locked or game over):
                // stay silent so it doesn't sound like progress, and mark it in the
                // log. LEDs + board highlight still fire; audio follows game logic.
                const ignored = gameEvent === 'ignored';
                log.logEvent(`${formatHit(event)}${ignored ? ' (ignored)' : ''}`, 'hit');
                if (ignored) {
                    // no audio
                } else if (gameEvent === 'bust' || gameEvent === 'miss') {
                    playBust();
                } else if (gameEvent === 'win') {
                    playWin();
                } else if (gameEvent === 'sprint') {
                    // Perfect set in Cat and Mouse — earned another three darts
                    playSprint();
                    log.logEvent('Sprint — three more darts', 'game');
                } else {
                    playHit(event.ring);
                    processCallouts(callouts);
                }
                showTargetLed(state, 800);
                persistState();
                if (!ignored) {
                    undoStack.push(undoSnap); // the dart counted — it can be undone
                }
                if (matchWin) {
                    handleMatchWin(state);
                } else {
                    handleGameOutcome(state, gameEvent);
                }
                if (gameEvent === 'sprint') {
                    headline.flash('SPRINT', 1500);
                } else {
                    headline.update();
                }
                updateUndoButton();
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
