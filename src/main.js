// Ghost Board - Granboard web interface

import { createDartboard } from './board/dartboard.js';
import { createConnection } from './ble/connection.js';
import { calcPoints } from './ble/protocol.js';
import { playHit, setTheme, getThemeNames, ensureAudio } from './audio/sounds.js';
import { settings, updateSettings } from './state/settings.js';
import { createMenu } from './ui/menu.js';
import { startGame, stopGame, getGame, getPanel } from './games/manager.js';

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

// -- Game area (panel gets injected here by the game module) --
const gameArea = document.createElement('div');
gameArea.className = 'game-area';
panelSidebar.appendChild(gameArea);

// -- New Game button --
const newGameBtn = document.createElement('button');
newGameBtn.className = 'new-game-btn';
newGameBtn.textContent = 'New Game (501)';
gameArea.appendChild(newGameBtn);

function handleNextPlayer() {
  const game = getGame();
  if (!game) {
    return;
  }
  const { state, event } = game.nextPlayer();
  getPanel().update(state, event);
}

function handleEndGame() {
  stopGame();
  newGameBtn.hidden = false;
}

newGameBtn.addEventListener('click', () => {
  newGameBtn.hidden = true;
  startGame('x01', { startingScore: 501, numPlayers: 2 }, gameArea, {
    onNextPlayer: handleNextPlayer,
    onEndGame: handleEndGame,
  });
});

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
    playHit(event.ring);
    hits.unshift(event);

    const li = document.createElement('li');
    li.textContent = formatHit(event);
    hitList.prepend(li);

    if (hitList.children.length > 50) {
      hitList.lastChild.remove();
    }

    // Forward to active game
    const game = getGame();
    const panel = getPanel();
    if (game && panel) {
      const { state, event: gameEvent } = game.onDart(event.ring, event.segment);
      panel.update(state, gameEvent);
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
}

const ble = createConnection(onEvent, onStatus);

connectBtn.addEventListener('click', () => {
  if (statusDot.dataset.status === 'connected') {
    ble.disconnect();
  } else {
    ble.connect();
  }
});
