// Full-screen win / draw celebration overlay.
//
// On a win it shows the winner's name above a large gold "WINS"; on a draw,
// just "DRAW". A leg/set win (match play) uses the same big treatment in a
// more discreet colour, reserving gold for taking the whole match. A mid-game
// phase/role transition (e.g. a Scram half ending) reuses that same teal
// treatment but auto-hides so play resumes without a click. Covers everything
// (readable across the room). Click anywhere or press Escape to dismiss; it's
// also hidden when the game ends or a new game starts.

import './win-display.css';

// How long the auto-hiding transition overlay lingers before play resumes —
// long enough to read the swap across the room, short enough not to stall.
const TRANSITION_MS = 2500;

export function createWinDisplay() {
    const el = document.createElement('div');
    el.className = 'win-display';
    el.hidden = true;

    const name = document.createElement('div');
    name.className = 'win-display-name';

    const label = document.createElement('div');
    label.className = 'win-display-label';

    el.append(name, label);
    document.body.appendChild(el);

    let transitionTimer = null;

    function hide() {
        clearTimeout(transitionTimer);
        el.hidden = true;
    }

    function showWin(winnerName) {
        el.classList.remove('win-display-leg');
        name.textContent = winnerName;
        name.hidden = false;
        label.textContent = 'WINS';
        el.hidden = false;
    }

    // Leg or set win during match play — same big overlay, discreet colour.
    function showLegWin(winnerName, what) {
        el.classList.add('win-display-leg');
        name.textContent = winnerName;
        name.hidden = false;
        label.textContent = what === 'set' ? 'WINS THE SET' : 'WINS THE LEG';
        el.hidden = false;
    }

    // Mid-game phase / role transition — same big teal treatment as a leg win
    // (not the gold win style), but auto-hides so the swap is covered and play
    // resumes on the new current player's turn without a manual dismiss.
    function showTransition(title, subtitle) {
        el.classList.add('win-display-leg');
        name.textContent = title;
        name.hidden = false;
        label.textContent = subtitle;
        el.hidden = false;
        clearTimeout(transitionTimer);
        transitionTimer = setTimeout(hide, TRANSITION_MS);
    }

    function showDraw() {
        el.classList.remove('win-display-leg');
        name.hidden = true;
        label.textContent = 'DRAW';
        el.hidden = false;
    }

    // Dismiss on click anywhere or Escape
    el.addEventListener('click', hide);
    document.addEventListener('keydown', (e) => {
        if (!el.hidden && e.key === 'Escape') {
            hide();
        }
    });

    return { showWin, showLegWin, showTransition, showDraw, hide };
}
