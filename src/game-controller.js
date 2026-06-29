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
import { onHit as ledHit, onSwitch as ledSwitch, allOff as ledsOff, allOn as ledsOn } from './ble/leds.js';
import { showTargetLed } from './ble/target-led.js';
import { playHit, playSwitch, playBust, playWin, playSprint } from './audio/sounds.js';
import { processCallouts } from './audio/callouts.js';
import { confirmDialog } from './ui/confirm.js';
import { createX01Setup } from './games/x01/setup.js';
import { createAroundTheClockSetup } from './games/around-the-clock/setup.js';
import { createCatAndMouseSetup } from './games/cat-and-mouse/setup.js';
import { createSimonSaysSetup } from './games/simon-says/setup.js';
import { meta as x01Meta } from './games/x01/meta.js';
import { meta as aroundTheClockMeta } from './games/around-the-clock/meta.js';
import { meta as catAndMouseMeta } from './games/cat-and-mouse/meta.js';
import { meta as simonSaysMeta } from './games/simon-says/meta.js';

const GAME_LABELS = {
    x01: 'X01',
    'around-the-clock': 'Around the Clock',
    'cat-and-mouse': 'Cat and Mouse',
    'simon-says': 'Simon Says',
};

const GAME_SETUPS = {
    x01: createX01Setup,
    'around-the-clock': createAroundTheClockSetup,
    'cat-and-mouse': createCatAndMouseSetup,
    'simon-says': createSimonSaysSetup,
};

// Per-game short descriptions for the picker hover title.
const GAME_META = {
    x01: x01Meta,
    'around-the-clock': aroundTheClockMeta,
    'cat-and-mouse': catAndMouseMeta,
    'simon-says': simonSaysMeta,
};

// Format a dart hit for the log (e.g. "T20 (60)", "BULL (50)", "Miss")
function formatHit(hit) {
    if (hit.ring === 'OUT') {
        return 'Miss';
    }
    if (hit.ring === 'DBULL') {
        return 'BULL (50)';
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

    function persistState() {
        const game = getGame();
        if (game && currentGameType && currentGameOpts) {
            saveGame({ type: currentGameType, options: currentGameOpts, state: game.getState() });
        }
    }

    // Log a round change once per round (skips finished games)
    function logRound(state) {
        if (!state || state.gameOver || state.round === lastLoggedRound) {
            return;
        }
        lastLoggedRound = state.round;
        log.logEvent(`Round ${state.round}`, 'game');
    }

    // Announce a win/draw outcome: log it and show the full-screen overlay
    // (no-op for other events)
    function handleGameOutcome(state, gameEvent) {
        if (gameEvent === 'win') {
            const name = createPlayer(state.players[state.winner].uuid).getName();
            log.logEvent(`${name} wins`, 'game');
            winDisplay.showWin(name);
        } else if (gameEvent === 'draw') {
            log.logEvent('Draw', 'game');
            winDisplay.showDraw();
        }
    }

    function handleNextPlayer() {
        const game = getGame();
        if (!game) {
            return;
        }
        playSwitch();
        ledSwitch();
        board.clearHighlight(); // don't carry the previous player's last hit over
        const { state, event, callouts } = game.nextPlayer();
        getPanel().update(state, event);
        processCallouts(callouts);
        showTargetLed(state, 1000);
        persistState();

        logRound(state);
        if (event === 'switch') {
            log.logEvent(`Player: ${playerLabel(state.players[state.currentPlayerIndex])}`, 'player');
        } else {
            handleGameOutcome(state, event);
        }
        headline.update();
    }

    function handleEndGame() {
        stopGame();
        clearGame();
        ledsOn();
        currentGameType = null;
        currentGameOpts = null;
        log.logEvent('Game ended', 'game');
        headline.update();
        winDisplay.hide();
        setMenuDisabled(false);
    }

    // End Game button: confirm first while a game is still in progress (an
    // accidental press would wipe it). Skip the prompt once the game is over.
    function requestEndGame() {
        const game = getGame();
        if (!game || game.getState().gameOver) {
            handleEndGame();
            return;
        }
        confirmDialog({
            message: 'End the current game?',
            confirmLabel: 'End Game',
            onConfirm: handleEndGame,
        });
    }

    function launchGame(type, opts, resumed = false) {
        currentGameType = type;
        currentGameOpts = opts;
        lastLoggedRound = 0;
        ledsOff();
        // opts carries numPlayers + playerUuids from the setup panel's roster
        startGame(type, opts, gameArea, {
            onNextPlayer: handleNextPlayer,
            onEndGame: requestEndGame,
        });

        const names = (opts.playerUuids || []).map((uuid) => createPlayer(uuid).getName());
        const who = names.length > 0 ? ` · ${names.join(', ')}` : '';
        log.logEvent(`Game ${resumed ? 'resumed' : 'started'} — ${GAME_LABELS[type] || type}${who}`, 'game');
        headline.update();
        winDisplay.hide();
        setMenuDisabled(true);
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
            const game = getGame();
            if (game) {
                game.loadState(savedGameData.state);
                getPanel().update(game.getState(), null);
                showTargetLed(game.getState(), 500);
                logRound(game.getState());
                headline.update();
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
                const { state, event: gameEvent, callouts } = game.onDart(event.ring, event.segment);
                panel.update(state, gameEvent);
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
                handleGameOutcome(state, gameEvent);
                if (gameEvent === 'sprint') {
                    headline.flash('SPRINT', 1500);
                } else {
                    headline.update();
                }
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
