// Ghost Board - Granboard web interface
//
// Composition root: builds the DOM scaffold and hardware (board, BLE, audio,
// settings menu), then hands the main-owned pieces to the game controller and
// wires the event streams together. Game lifecycle and dart handling live in
// game-controller.js; the heads-up display, callout scheduler, and target-LED
// glue live in their own modules.

import { createDartboard } from './board/dartboard.js';
import { BOARD_THEMES, DEFAULT_BOARD_THEME } from './board/segments.js';
import { createConnection } from './ble/connection.js';
import { createLog } from './ui/log.js';
import { createPhysicalLeds } from './ble/leds.js';
import { sweep as ledSweep, registerLedOutput } from './led-controller.js';
import { setTheme, setVoice, getThemeNames, getVoiceOptions, ensureAudio } from './audio/sounds.js';
import { settings, updateSettings } from './state/settings.js';
import { createMenu } from './ui/menu.js';
import { createConnectionControl } from './ui/connection-control.js';
import { icons } from './ui/icons.js';
import { openPlayerConfig } from './ui/player-config.js';
import { createWinDisplay } from './ui/win-display.js';
import { createBoardHeadline } from './ui/board-headline.js';
import { createGameController } from './game-controller.js';

const app = document.getElementById('app');

// -- Left panel: dartboard + heads-up display --
const panelBoard = document.createElement('div');
panelBoard.className = 'panel-board';
app.appendChild(panelBoard);
const board = createDartboard(panelBoard);
const headline = createBoardHeadline(panelBoard);

// The SVG board is one LED output (it mirrors LED state with no BLE involved).
registerLedOutput(board.leds);

// Apply the saved board colour theme
board.setTheme(settings().display.boardTheme);

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

// -- Audio preferences --
const savedTheme = settings().audio.theme;
setTheme(savedTheme);

const savedVoice = settings().audio.voice;
if (savedVoice) {
    setVoice(savedVoice);
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

// -- Game controller: owns the game lifecycle and dart/button handling --
const controller = createGameController({ gameArea, board, headline, log, winDisplay, setMenuDisabled });

newGameBtn.addEventListener('click', () => {
    controller.startNewGame();
});

// Debug mode: mouse clicks on board count as hits
function setDebugMode(enabled) {
    board.onSegmentClick(enabled ? (seg) => {
        controller.handleEvent({ type: 'hit', ring: seg.ring, segment: seg.segment });
    } : null);
}

const savedDebug = settings().debug.mouseInput;
if (savedDebug) {
    setDebugMode(true);
}

// -- Settings menu (floating overlay) --
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
                options: ['(default)'],
                value: savedVoice || '(default)',
                onChange(value) {
                    const name = value === '(default)' ? '' : value;
                    setVoice(name);
                    updateSettings('audio.voice', name);
                },
                onRender(selectEl) {
                    // Populate sorted, language-labelled voices (value = voice
                    // name). Rebuild when the async voice list loads/changes.
                    const populate = () => {
                        const current = selectEl.value || savedVoice || '(default)';
                        selectEl.innerHTML = '';
                        const opts = [{ value: '(default)', label: '(default)' }, ...getVoiceOptions()];
                        for (const { value, label } of opts) {
                            const o = document.createElement('option');
                            o.value = value;
                            o.textContent = label;
                            selectEl.appendChild(o);
                        }
                        selectEl.value = current;
                    };
                    populate();
                    if (window.speechSynthesis) {
                        window.speechSynthesis.addEventListener('voiceschanged', populate);
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
                    headline.update();
                },
            },
            {
                label: 'Board theme',
                type: 'select',
                options: Object.keys(BOARD_THEMES).map((key) => BOARD_THEMES[key].label),
                value: (BOARD_THEMES[settings().display.boardTheme] || BOARD_THEMES[DEFAULT_BOARD_THEME]).label,
                onChange(label) {
                    const key = Object.keys(BOARD_THEMES).find((k) => BOARD_THEMES[k].label === label);
                    board.setTheme(key);
                    updateSettings('display.boardTheme', key);
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

app.appendChild(panelSidebar);

// Restore a saved game on load (if any)
controller.restore();

// -- Connection status handling --
function onStatus({ status, detail }) {
    connControl.setStatus(status, detail);
    log.logEvent(detail || status, status === 'error' ? 'error' : 'info');

    if (status === 'connected') {
        ledSweep();
    }
}

const ble = createConnection(controller.handleEvent, onStatus);
// The physical board is the other LED output (encodes → BLE).
registerLedOutput(createPhysicalLeds((data) => ble.write(data)));
