// Small click-popover: shows a line of text anchored to an element.
// One at a time; dismiss by clicking outside or pressing Escape. Touch-friendly
// (click, not hover).

let current = null;
let currentAnchor = null;

function close() {
    if (!current) {
        return;
    }
    current.remove();
    current = null;
    currentAnchor = null;
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey);
}

function onDocClick(e) {
    // Ignore clicks on the anchor itself — its own handler toggles the popover.
    if (current && !current.contains(e.target) && !(currentAnchor && currentAnchor.contains(e.target))) {
        close();
    }
}

function onKey(e) {
    if (e.key === 'Escape') {
        close();
    }
}

export function showPopover(anchor, text) {
    // Second click on the same anchor toggles it closed.
    if (current && currentAnchor === anchor) {
        close();
        return;
    }
    close();

    const pop = document.createElement('div');
    pop.className = 'info-popover';
    pop.textContent = text;
    document.body.appendChild(pop);

    // Position just below the anchor, clamped to the viewport
    const r = anchor.getBoundingClientRect();
    let left = r.left;
    const maxLeft = window.innerWidth - pop.offsetWidth - 8;
    if (left > maxLeft) {
        left = maxLeft;
    }
    if (left < 8) {
        left = 8;
    }
    pop.style.top = `${r.bottom + 6}px`;
    pop.style.left = `${left}px`;

    current = pop;
    currentAnchor = anchor;
    // Defer so the opening click doesn't immediately dismiss it
    setTimeout(() => {
        document.addEventListener('click', onDocClick, true);
        document.addEventListener('keydown', onKey);
    }, 0);
}
