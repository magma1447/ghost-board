// Small click-popover: shows a line of text anchored to an element.
// One at a time; dismiss by clicking outside or pressing Escape. Touch-friendly
// (click, not hover).

let current = null;

function close() {
    if (!current) {
        return;
    }
    current.remove();
    current = null;
    document.removeEventListener('click', onDocClick, true);
    document.removeEventListener('keydown', onKey);
}

function onDocClick(e) {
    if (current && !current.contains(e.target)) {
        close();
    }
}

function onKey(e) {
    if (e.key === 'Escape') {
        close();
    }
}

export function showPopover(anchor, text) {
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
    // Defer so the opening click doesn't immediately dismiss it
    setTimeout(() => {
        document.addEventListener('click', onDocClick, true);
        document.addEventListener('keydown', onKey);
    }, 0);
}
