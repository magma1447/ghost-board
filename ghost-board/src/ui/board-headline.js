// Big current-player number overlaid on the board (heads-up display).
//
// Reads the active game's headline (points remaining, current target, score…)
// and the Display "Big number" setting. The element is pointer-events:none (in
// CSS) so board clicks (debug input) pass straight through.

import './board-headline.css';
import { getGame } from '../games/manager.js';
import { settings } from '../state/settings.js';

export function createBoardHeadline(parent) {
    const el = document.createElement('div');
    el.className = 'board-headline';
    el.hidden = true;
    parent.appendChild(el);

    // Set the overlay text (or hide it when empty). Font size adapts to length
    // via data-len so longer values (1001, "Bull") don't overflow the board.
    function set(text) {
        const str = (text === 0 || text) ? String(text) : '';
        if (!str) {
            el.hidden = true;
            el.textContent = '';
            return;
        }
        el.dataset.len = str.length <= 2 ? 'short' : (str.length === 3 ? 'mid' : 'long');
        el.textContent = str;
        el.hidden = false;
    }

    // Refresh the overlay from the active game, respecting the Display setting.
    function update() {
        const game = getGame();
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
