// Game lifecycle manager

import { createX01 } from './x01/game.js';
import { createX01Panel } from './x01/panel.js';

const GAME_TYPES = {
  x01: { createGame: createX01, createPanel: createX01Panel },
};

let activeGame = null;
let activePanel = null;

export function startGame(type, options, container, callbacks) {
  // Clean up previous game if any
  if (activePanel) {
    activePanel.destroy();
  }

  const entry = GAME_TYPES[type];
  if (!entry) {
    throw new Error(`Unknown game type: ${type}`);
  }

  activeGame = entry.createGame(options);
  activePanel = entry.createPanel(container, callbacks);
  activePanel.update(activeGame.getState(), null);
  return activeGame;
}

export function stopGame() {
  if (activePanel) {
    activePanel.destroy();
  }
  activeGame = null;
  activePanel = null;
}

export function getGame() {
  return activeGame;
}

export function getPanel() {
  return activePanel;
}

export function getGameTypes() {
  return Object.keys(GAME_TYPES);
}
