// Big current-player number overlaid on the board (heads-up display).
//
// Shows the game's headline (points remaining, current target, score…) for
// the game the controller pushes into update(), respecting the Display "Big
// number" setting. The element is pointer-events:none (in CSS) so board
// clicks (debug input) pass straight through.

import './board-headline.css';
import { settings } from '../state/settings.js';

export function createBoardHeadline(parent) {
    const el = document.createElement('div');
    el.className = 'board-headline';
    el.hidden = true;
    parent.appendChild(el);

    // Set the overlay text (or hide it when empty). Font size adapts to length
    // via data-len so longer values (1001, "Bull") don't overflow the board.
    function set(text) {
        // Blank when there's nothing worth showing — including a bare "0"
        // (a fresh score/count of 0 shouldn't be shouted on the board; no game
        // has a meaningful "0" headline).
        const str = String(text ?? '');
        if (!str || str === '0') {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.dataset.len = str.length <= 2 ? 'short' : (str.length === 3 ? 'mid' : 'long');
        el.textContent = str;
        el.hidden = false;
    }

    // Refresh the overlay from the given game (the controller pushes the
    // active game on every state change; null clears). Calling with no
    // argument re-renders the last pushed game — used by the flash revert and
    // the Display-setting toggle.
    let lastGame = null;
    function update(game = lastGame) {
        lastGame = game;
        // Clear the number once the game is over (won/drawn) — a target or score
        // shouldn't linger as if still live.
        if (game && settings().display.bigNumber && !game.getState().isGameOver) {
            const state = game.getState();
            set(game.getHeadline());
            // Fade the number out once the turn is over (darts used up, or locked
            // after a bust) so a target no longer reads as live; it cues "press
            // Next Player". Restored on the next turn / switch.
            const turnComplete = state.turn.darts.length >= state.dartsPerTurn || state.turn.locked;
            el.classList.toggle('faded', turnComplete);
        } else {
            set('');
        }
    }

    // Briefly flash a word (e.g. SPRINT) in the big display, then revert to the
    // normal headline. Used for the Cat and Mouse sprint bonus.
    let flashTimeout = null;
    function flash(text, durationMs) {
        clearTimeout(flashTimeout);
        el.textContent = text;
        el.removeAttribute('data-len');
        el.hidden = false;
        el.classList.remove('faded');
        el.classList.add('flash');
        flashTimeout = setTimeout(() => {
            el.classList.remove('flash');
            update();
        }, durationMs);
    }

    return { update, flash };
}
