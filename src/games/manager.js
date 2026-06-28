// Game lifecycle manager

import { createX01 } from './x01/game.js';
import { createX01Panel } from './x01/panel.js';
import { createAroundTheClock } from './around-the-clock/game.js';
import { createAroundTheClockPanel } from './around-the-clock/panel.js';
import { createCatAndMouse } from './cat-and-mouse/game.js';
import { createCatAndMousePanel } from './cat-and-mouse/panel.js';
import { createSimonSays } from './simon-says/game.js';
import { createSimonSaysPanel } from './simon-says/panel.js';

const GAME_TYPES = {
    x01: { createGame: createX01, createPanel: createX01Panel },
    'around-the-clock': { createGame: createAroundTheClock, createPanel: createAroundTheClockPanel },
    'cat-and-mouse': { createGame: createCatAndMouse, createPanel: createCatAndMousePanel },
    'simon-says': { createGame: createSimonSays, createPanel: createSimonSaysPanel },
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
