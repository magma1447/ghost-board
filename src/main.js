// Ghost Board - Granboard web interface

import { createDartboard } from './board/dartboard.js';
import { createConnection } from './ble/connection.js';
import { calcPoints } from './ble/protocol.js';
import { init as initLeds, onHit as ledHit, onSwitch as ledSwitch, sweep as ledSweep, allOff as ledsOff, allOn as ledsOn, showSegment as ledShowSegment, showSegments as ledShowSegments } from './ble/leds.js';
import { LED_COLOR } from './ble/protocol.js';
import { playHit, playSwitch, playBust, playWin, playChime, speakScore, setTheme, setVoice, getThemeNames, getVoiceNames, ensureAudio } from './audio/sounds.js';
import { settings, updateSettings } from './state/settings.js';
import { saveGame, loadGame, clearGame } from './state/game-store.js';
import { createMenu } from './ui/menu.js';
import { startGame, stopGame, getGame, getPanel } from './games/manager.js';
import { createX01Setup } from './games/x01/setup.js';
import { createAroundTheClockSetup } from './games/around-the-clock/setup.js';
import { createCatAndMouseSetup } from './games/cat-and-mouse/setup.js';
import { createSimonSaysSetup } from './games/simon-says/setup.js';

const app = document.getElementById('app');

// -- Left panel: dartboard --
const panelBoard = document.createElement('div');
panelBoard.className = 'panel-board';
app.appendChild(panelBoard);
const board = createDartboard(panelBoard);

// -- Right panel: status + hit log --
const panelSidebar = document.createElement('div');
panelSidebar.className = 'panel-sidebar';

const statusBar = document.createElement('div');
statusBar.className = 'status-bar';

const statusDot = document.createElement('div');
statusDot.className = 'status-dot';

const statusText = document.createElement('span');
statusText.className = 'status-text';
statusText.textContent = 'Disconnected';

const connectBtn = document.createElement('button');
connectBtn.className = 'connect-btn';
connectBtn.textContent = 'Connect';

const settingsBtn = document.createElement('button');
settingsBtn.className = 'settings-btn';
settingsBtn.innerHTML = '&#9881;'; // gear icon
settingsBtn.title = 'Settings';

statusBar.append(statusDot, statusText, connectBtn, settingsBtn);
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

// -- New Game button --
const newGameBtn = document.createElement('button');
newGameBtn.className = 'new-game-btn';
newGameBtn.textContent = 'New Game';
gameArea.appendChild(newGameBtn);

// Track current game type and options for persistence
let currentGameType = null;
let currentGameOpts = null;

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
    const { state, event, callouts } = game.nextPlayer();
    getPanel().update(state, event);
    processCallouts(callouts);
    showTargetLed(state, 1000);
    persistState();
}

function handleEndGame() {
    stopGame();
    clearGame();
    ledsOn();
    currentGameType = null;
    currentGameOpts = null;
    newGameBtn.hidden = false;
}

function launchGame(type, opts) {
    currentGameType = type;
    currentGameOpts = opts;
    ledsOff();
    startGame(type, { ...opts, numPlayers: 2 }, gameArea, {
        onNextPlayer: handleNextPlayer,
        onEndGame: handleEndGame,
    });
}

const GAME_SETUPS = {
    x01: createX01Setup,
    'around-the-clock': createAroundTheClockSetup,
    'cat-and-mouse': createCatAndMouseSetup,
    'simon-says': createSimonSaysSetup,
};

function showGamePicker() {
    const picker = document.createElement('div');
    picker.className = 'game-picker';

    for (const [type, label] of [['x01', 'X01'], ['around-the-clock', 'Around the Clock'], ['cat-and-mouse', 'Cat and Mouse'], ['simon-says', 'Simon Says']]) {
        const btn = document.createElement('button');
        btn.className = 'game-picker-btn';
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
                }
            });
        });
        picker.appendChild(btn);
    }

    gameArea.appendChild(picker);
}

newGameBtn.addEventListener('click', () => {
    newGameBtn.hidden = true;
    showGamePicker();
});

// -- Restore saved game on load --
const savedGameData = loadGame();
if (savedGameData && GAME_SETUPS[savedGameData.type]) {
    newGameBtn.hidden = true;
    launchGame(savedGameData.type, savedGameData.options);
    const game = getGame();
    if (game) {
        game.loadState(savedGameData.state);
        getPanel().update(game.getState(), null);
        showTargetLed(game.getState(), 500);
    }
}

// -- Hit log --
const hitLog = document.createElement('div');
hitLog.className = 'hit-log';
const hitTitle = document.createElement('h2');
hitTitle.textContent = 'Hits';
const hitList = document.createElement('ul');
hitList.className = 'hit-list';
hitLog.append(hitTitle, hitList);
panelSidebar.appendChild(hitLog);

app.appendChild(panelSidebar);

const hits = [];

function formatHit(hit) {
    if (hit.ring === 'OUT') {
        return 'Miss (0)';
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

function onEvent(event) {
    if (event.type === 'hit') {
        board.highlight(event.ring, event.segment);
        ledHit(event.ring, event.segment);
        hits.unshift(event);

        const li = document.createElement('li');
        li.textContent = formatHit(event);
        hitList.prepend(li);

        if (hitList.children.length > 50) {
            hitList.lastChild.remove();
        }

        // Forward to active game — decide sound based on game result
        const game = getGame();
        const panel = getPanel();
        if (game && panel) {
            const { state, event: gameEvent, callouts } = game.onDart(event.ring, event.segment);
            panel.update(state, gameEvent);
            if (gameEvent === 'bust' || gameEvent === 'miss') {
                playBust();
            } else if (gameEvent === 'win') {
                playWin();
            } else {
                playHit(event.ring);
                processCallouts(callouts);
            }
            showTargetLed(state, 800);
            persistState();
        } else {
            playHit(event.ring);
        }
    }

    if (event.type === 'button') {
        handleNextPlayer();
    }
}

function onStatus({ status, detail }) {
    statusDot.dataset.status = status;
    statusText.textContent = detail;
    connectBtn.textContent = status === 'connected' ? 'Disconnect' : 'Connect';

    if (status === 'connected') {
        ledSweep();
    }
}

const ble = createConnection(onEvent, onStatus);
initLeds((data) => ble.write(data));

connectBtn.addEventListener('click', () => {
    if (statusDot.dataset.status === 'connected') {
        ble.disconnect();
    } else {
        ble.connect();
    }
});
