// Full-screen win / draw celebration overlay.
//
// On a win it shows the winner's name above a large gold "WINS"; on a draw,
// just "DRAW". Covers everything (readable across the room). Click anywhere
// or press Escape to dismiss; it's also hidden when the game ends or a new
// game starts.

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

    function hide() {
        el.hidden = true;
    }

    function showWin(winnerName) {
        name.textContent = winnerName;
        name.hidden = false;
        label.textContent = 'WINS';
        el.hidden = false;
    }

    function showDraw() {
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

    return { showWin, showDraw, hide };
}
