// Undo history — deep-cloned game-state snapshots taken before each counting
// dart and each player switch, scoped to the current leg (cleared on new
// game/leg). The controller owns *when* to snapshot/restore; this owns the
// stack and the Undo button's enabled state.

import { getGame, getPanel } from './game-engine/core/manager.js';

export function createUndoStack() {
    const stack = [];

    // Capture the current game state (call before a dart/switch mutates it).
    function snapshot() {
        return JSON.parse(JSON.stringify(getGame().getState()));
    }

    function push(snap = snapshot()) {
        stack.push(snap);
    }

    function pop() {
        return stack.pop();
    }

    function clear() {
        stack.length = 0;
    }

    function isEmpty() {
        return stack.length === 0;
    }

    // Undo is offered only for the simple cases: something on the stack and the
    // game/leg not yet over (the leg/game-ending dart and cross-leg undo are
    // out of scope and stay disabled).
    function updateButton() {
        const panel = getPanel();
        const game = getGame();
        if (panel && panel.undoBtn) {
            panel.undoBtn.disabled = !(stack.length > 0 && game && !game.getState().isGameOver);
        }
    }

    return { snapshot, push, pop, clear, isEmpty, updateButton };
}
