// Ghost Board - Granboard web interface

import { createDartboard } from './board/dartboard.js';
import { createConnection } from './ble/connection.js';
import { calcPoints } from './ble/protocol.js';
import { init as initLeds, onHit as ledHit, onSwitch as ledSwitch, sweep as ledSweep, allOff as ledsOff, allOn as ledsOn } from './ble/leds.js';
import { playHit, playSwitch, playBust, playWin, playChime, speakScore, setTheme, setVoice, getThemeNames, getVoiceNames, ensureAudio } from './audio/sounds.js';
import { settings, updateSettings } from './state/settings.js';
import { saveGame, loadGame, clearGame } from './state/game-store.js';
import { createMenu } from './ui/menu.js';
import { startGame, stopGame, getGame, getPanel } from './games/manager.js';
import { createX01Setup } from './games/x01/setup.js';

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

// -- Callout system: game returns callouts, we decide how to play them --
const pendingCallouts = [];

function processCallouts(callouts) {
  if (!callouts || callouts.length === 0) {
    return;
  }

  // Cancel pending timeouts and current speech
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
    if (c.type === 'turnTotal' && !audio.callTurnTotal) {
      continue;
    }
    if (c.type === 'remaining' && !audio.callRemaining) {
      continue;
    }
    if (c.type === 'checkout' && !audio.callCheckout) {
      continue;
    }

    // Extra gap before remaining if something was spoken before it
    if (c.type === 'remaining' && delay > 0) {
      delay += 1000;
    }

    // Chime before remaining
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

// Track current game options for persistence
let currentGameOpts = null;

function persistState() {
  const game = getGame();
  if (game && currentGameOpts) {
    saveGame({ type: 'x01', options: currentGameOpts, state: game.getState() });
  }
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
  persistState();
}

function handleEndGame() {
  stopGame();
  clearGame();
  ledsOn();
  currentGameOpts = null;
  newGameBtn.hidden = false;
}

function launchGame(opts) {
  currentGameOpts = opts;
  ledsOff();
  startGame('x01', { ...opts, numPlayers: 2 }, gameArea, {
    onNextPlayer: handleNextPlayer,
    onEndGame: handleEndGame,
  });
}

newGameBtn.addEventListener('click', () => {
  newGameBtn.hidden = true;

  // Show setup panel
  createX01Setup(gameArea, (opts) => {
    clearGame();
    launchGame(opts);
  });
});

// -- Restore saved game on load --
const savedGameData = loadGame();
if (savedGameData && savedGameData.type === 'x01') {
  newGameBtn.hidden = true;
  launchGame(savedGameData.options);
  const game = getGame();
  if (game) {
    game.loadState(savedGameData.state);
    getPanel().update(game.getState(), null);
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
      if (gameEvent === 'bust') {
        playBust();
      } else if (gameEvent === 'win') {
        playWin();
      } else {
        playHit(event.ring);
        processCallouts(callouts);
      }
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
