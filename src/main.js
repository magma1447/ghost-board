// Ghost Board - Granboard web interface

import { createDartboard } from './board/dartboard.js';
import { createConnection } from './ble/connection.js';
import { createLog } from './ui/log.js';
import { init as initLeds, onHit as ledHit, onSwitch as ledSwitch, sweep as ledSweep, allOff as ledsOff, allOn as ledsOn, showSegment as ledShowSegment, showSegments as ledShowSegments } from './ble/leds.js';
import { LED_COLOR, calcPoints } from './ble/protocol.js';
import { playHit, playSwitch, playBust, playWin, playChime, speakScore, setTheme, setVoice, getThemeNames, getVoiceNames, ensureAudio } from './audio/sounds.js';
import { settings, updateSettings } from './state/settings.js';
import { saveGame, loadGame, clearGame } from './state/game-store.js';
import { createMenu } from './ui/menu.js';
import { createConnectionControl } from './ui/connection-control.js';
import { icons } from './ui/icons.js';
import { startGame, stopGame, getGame, getPanel } from './games/manager.js';
import { createX01Setup } from './games/x01/setup.js';
import { createAroundTheClockSetup } from './games/around-the-clock/setup.js';
import { createCatAndMouseSetup } from './games/cat-and-mouse/setup.js';
import { createSimonSaysSetup } from './games/simon-says/setup.js';
import { openPlayerConfig } from './ui/player-config.js';
import { createPlayer } from './state/players.js';
import { createWinDisplay } from './ui/win-display.js';
import { confirmDialog } from './ui/confirm.js';

const app = document.getElementById('app');

// -- Left panel: dartboard --
const panelBoard = document.createElement('div');
panelBoard.className = 'panel-board';
app.appendChild(panelBoard);
const board = createDartboard(panelBoard);

// Big current-player number overlaid on the board (heads-up display).
// pointer-events:none so board clicks (debug input) pass straight through.
const boardHeadline = document.createElement('div');
boardHeadline.className = 'board-headline';
boardHeadline.hidden = true;
panelBoard.appendChild(boardHeadline);

// Set the overlay text (or hide it when empty). Font size adapts to length
// via data-len so longer values (1001, "Bull") don't overflow the board.
function setBoardHeadline(text) {
    const str = (text === 0 || text) ? String(text) : '';
    if (!str) {
        boardHeadline.hidden = true;
        boardHeadline.textContent = '';
        return;
    }
    boardHeadline.dataset.len = str.length <= 2 ? 'short' : (str.length === 3 ? 'mid' : 'long');
    boardHeadline.textContent = str;
    boardHeadline.hidden = false;
}

// Refresh the overlay from the active game, respecting the Display setting
function updateHeadline() {
    const game = getGame();
    if (game && settings().display.bigNumber) {
        const state = game.getState();
        setBoardHeadline(game.getHeadline());
        // Fade the number out once the turn is over (darts used up, or locked
        // after a bust) so a target no longer reads as live; it cues "press
        // Next Player". Restored on the next turn / switch.
        const turnComplete = !state.gameOver
            && (state.turnDarts.length >= state.dartsPerTurn || state.turnLocked);
        boardHeadline.classList.toggle('faded', turnComplete);
    } else {
        setBoardHeadline('');
    }
}

// -- Right panel: status + hit log --
const panelSidebar = document.createElement('div');
panelSidebar.className = 'panel-sidebar';

const statusBar = document.createElement('div');
statusBar.className = 'status-bar';

const settingsBtn = document.createElement('button');
settingsBtn.className = 'btn btn-icon';
settingsBtn.innerHTML = icons.settings;
settingsBtn.title = 'Settings';

// Bluetooth connection icon + dropdown (sits left of the gear).
// onConnect/onDisconnect reference `ble`, which is created further down —
// these only run on click, by which point it's initialized.
const connControl = createConnectionControl({
    onConnect: () => ble.connect(),
    onDisconnect: () => ble.disconnect(),
});

// Top bar = persistent menu. Left group holds the app actions (New Game /
// Players, populated below); right group holds the connection + settings icons.
const statusMenu = document.createElement('div');
statusMenu.className = 'status-menu';

const statusIcons = document.createElement('div');
statusIcons.className = 'status-icons';
statusIcons.append(connControl.element, settingsBtn);

statusBar.append(statusMenu, statusIcons);
panelSidebar.appendChild(statusBar);

// -- Settings menu (floating overlay) --
const savedTheme = settings().audio.theme;
setTheme(savedTheme);

const savedVoice = settings().audio.voice;
if (savedVoice) {
    setVoice(savedVoice);
}

// Debug mode: mouse clicks on board count as hits
function setDebugMode(enabled) {
    board.onSegmentClick(enabled ? (seg) => {
        onEvent({ type: 'hit', ring: seg.ring, segment: seg.segment });
    } : null);
}

const savedDebug = settings().debug.mouseInput;
if (savedDebug) {
    setDebugMode(true);
}

const menu = createMenu(settingsBtn, [
    {
        label: 'Audio',
        children: [
            {
                label: 'Sound theme',
                type: 'select',
                options: getThemeNames(),
                value: savedTheme,
                onChange(value) {
                    setTheme(value);
                    updateSettings('audio.theme', value);
                    ensureAudio();
                },
            },
            {
                label: 'Call turn total',
                type: 'toggle',
                value: settings().audio.callTurnTotal,
                onChange(enabled) {
                    updateSettings('audio.callTurnTotal', enabled);
                },
            },
            {
                label: 'Call remaining',
                type: 'toggle',
                value: settings().audio.callRemaining,
                onChange(enabled) {
                    updateSettings('audio.callRemaining', enabled);
                },
            },
            {
                label: 'Call checkout',
                type: 'toggle',
                value: settings().audio.callCheckout,
                onChange(enabled) {
                    updateSettings('audio.callCheckout', enabled);
                },
            },
            {
                label: 'Voice',
                type: 'select',
                options: ['(default)', ...getVoiceNames()],
                value: savedVoice || '(default)',
                onChange(value) {
                    const name = value === '(default)' ? '' : value;
                    setVoice(name);
                    updateSettings('audio.voice', name);
                },
                onRender(selectEl) {
                    if (window.speechSynthesis) {
                        window.speechSynthesis.addEventListener('voiceschanged', () => {
                            const current = selectEl.value;
                            selectEl.innerHTML = '';
                            for (const name of ['(default)', ...getVoiceNames()]) {
                                const o = document.createElement('option');
                                o.value = name;
                                o.textContent = name;
                                selectEl.appendChild(o);
                            }
                            selectEl.value = current || '(default)';
                        });
                    }
                },
            },
        ],
    },
    {
        label: 'Display',
        children: [
            {
                label: 'Big number',
                type: 'toggle',
                value: settings().display.bigNumber,
                onChange(enabled) {
                    updateSettings('display.bigNumber', enabled);
                    updateHeadline();
                },
            },
        ],
    },
    {
        label: 'Debug',
        children: [
            {
                label: 'Mouse input',
                type: 'toggle',
                value: savedDebug,
                onChange(enabled) {
                    updateSettings('debug.mouseInput', enabled);
                    setDebugMode(enabled);
                },
            },
        ],
    },
]);

settingsBtn.addEventListener('click', (e) => {
    e.stopPropagation();
    menu.toggle();
});

// -- Callout system --
// Games return callout arrays from onDart() and nextPlayer(). Each callout has
// a type ('turnTotal', 'remaining', 'checkout') and a numeric value to speak.
// This function schedules them as timed speech events, respecting user settings.
//
// Timing sequence for a player switch with turn total enabled:
//   0ms:    speak turn total (e.g. "sixty")
//   1500ms: extra gap before remaining score
//   2500ms: play chime
//   2900ms: speak remaining (e.g. "three oh one")
//
// Each new dart cancels any pending callouts to avoid overlap.
const pendingCallouts = [];

function processCallouts(callouts) {
    if (!callouts || callouts.length === 0) {
        return;
    }

    // Cancel any in-flight callouts from the previous dart
    for (const id of pendingCallouts) {
        clearTimeout(id);
    }
    pendingCallouts.length = 0;
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    const audio = settings().audio;
    let delay = 0;

    for (const c of callouts) {
    // Skip callout types the user has disabled in settings
        if (c.type === 'turnTotal' && !audio.callTurnTotal) {
            continue;
        }
        if (c.type === 'remaining' && !audio.callRemaining) {
            continue;
        }
        if (c.type === 'checkout' && !audio.callCheckout) {
            continue;
        }

        // Add a pause before 'remaining' if a previous callout was already queued
        // (e.g. turn total was spoken first — need a gap so they don't blend)
        if (c.type === 'remaining' && delay > 0) {
            delay += 1000;
        }

        // 'remaining' callouts get a chime sound before the spoken number
        if (c.type === 'remaining') {
            pendingCallouts.push(setTimeout(() => playChime(), delay));
            delay += 400;
        }

        const d = delay;
        pendingCallouts.push(setTimeout(() => speakScore(c.value), d));
        delay += 1500;
    }
}

// -- Game area (panel gets injected here by the game module) --
const gameArea = document.createElement('div');
gameArea.className = 'game-area';
panelSidebar.appendChild(gameArea);

// Global event log (collapsible console). Created before the game flow so
// game start/restore can log into it.
const log = createLog(panelSidebar);

// Full-screen win / draw celebration overlay
const winDisplay = createWinDisplay();

// -- Top-bar menu actions (New Game + Players) --
const newGameBtn = document.createElement('button');
newGameBtn.className = 'btn btn-small';
newGameBtn.textContent = 'New Game';

const playersBtn = document.createElement('button');
playersBtn.className = 'btn btn-small';
playersBtn.textContent = 'Players';
playersBtn.addEventListener('click', () => openPlayerConfig());

statusMenu.append(newGameBtn, playersBtn);

// Disable the menu actions while a game is running (avoids abandoning a game
// by misclick, and slims the UI during play).
function setMenuDisabled(disabled) {
    newGameBtn.disabled = disabled;
    playersBtn.disabled = disabled;
}

// Track current game type and options for persistence
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

// For target-based games, light up target segment(s) in green after a short
// delay. The delay lets the hit flash animation play first (800ms after dart,
// 1000ms after switch). Supports both single-target games (Around the Clock,
// Cat and Mouse via player.currentTarget) and multi-target games (Simon Says
// via state.targetSegments).
let targetLedTimeout = null;

function showTargetLed(state, delayMs) {
    clearTimeout(targetLedTimeout);
    if (state.gameOver) {
        return;
    }

    // Multi-target: light up all remaining targets (Simon Says)
    if (state.targetSegments && state.targetSegments.length > 0) {
        targetLedTimeout = setTimeout(() => {
            ledShowSegments(state.targetSegments, LED_COLOR.GREEN);
        }, delayMs);
        return;
    }

    // Single target: light up the current player's target
    const player = state.players[state.currentPlayerIndex];
    if (!player || !player.currentTarget || player.currentTarget > 20) {
        return;
    }
    targetLedTimeout = setTimeout(() => {
        ledShowSegment(player.currentTarget, LED_COLOR.GREEN);
    }, delayMs);
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
    updateHeadline();
}

function handleEndGame() {
    stopGame();
    clearGame();
    ledsOn();
    currentGameType = null;
    currentGameOpts = null;
    log.logEvent('Game ended', 'game');
    updateHeadline();
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

// New Game from the persistent menu: abandon any active game / in-flight
// picker/setup, clear the area, then show the picker.
function startNewGameFlow() {
    if (getGame()) {
        handleEndGame();
    }
    gameArea.innerHTML = '';
    showGamePicker();
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
    updateHeadline();
    winDisplay.hide();
    setMenuDisabled(true);
}

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

newGameBtn.addEventListener('click', () => {
    startNewGameFlow();
});

// -- Restore saved game on load --
const savedGameData = loadGame();
if (savedGameData && GAME_SETUPS[savedGameData.type]) {
    launchGame(savedGameData.type, savedGameData.options, true);
    const game = getGame();
    if (game) {
        game.loadState(savedGameData.state);
        getPanel().update(game.getState(), null);
        showTargetLed(game.getState(), 500);
        logRound(game.getState());
        updateHeadline();
    }
}

app.appendChild(panelSidebar);

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

function onEvent(event) {
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
            } else {
                playHit(event.ring);
                processCallouts(callouts);
            }
            showTargetLed(state, 800);
            persistState();
            handleGameOutcome(state, gameEvent);
            updateHeadline();
        } else {
            log.logEvent(formatHit(event), 'hit');
            playHit(event.ring);
        }
    }

    if (event.type === 'button') {
        handleNextPlayer();
    }
}

function onStatus({ status, detail }) {
    connControl.setStatus(status, detail);
    log.logEvent(detail || status, status === 'error' ? 'error' : 'info');

    if (status === 'connected') {
        ledSweep();
    }
}

const ble = createConnection(onEvent, onStatus);
initLeds((data) => ble.write(data));
