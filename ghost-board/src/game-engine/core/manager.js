// Game lifecycle manager

import { GAMES } from './registry.js';

// type → { createGame, createPanel }, derived from the ordered registry so the
// game roster stays a single source of truth.
const GAME_TYPES = Object.fromEntries(
    GAMES.map(({ type, createGame, createPanel }) => [type, { createGame, createPanel }]),
);

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
    // No initial update here — the controller renders right after startGame()
    // with the match state layered in (refreshPanel), so one render, not two.
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
