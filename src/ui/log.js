// Global event log — a collapsible console at the bottom of the sidebar.
//
// Records app-wide events: connection changes, game start/end, player
// switches, dart hits, errors. Global scope (not game-specific). Collapsed
// by default to a thin header showing the latest entry; expand to review the
// full chronological stream. The header footprint is tiny, so the game area
// keeps the sidebar's vertical space.

import './log.css';

const MAX_ENTRIES = 200;

export function createLog(container, { expanded = false } = {}) {
    const el = document.createElement('div');
    el.className = 'log-console';

    const header = document.createElement('button');
    header.type = 'button';
    header.className = 'log-header';

    const chevron = document.createElement('span');
    chevron.className = 'log-chevron';
    chevron.textContent = '▴'; // points up (expands upward); flips down when open

    const titleEl = document.createElement('span');
    titleEl.className = 'log-title';
    titleEl.textContent = 'Log';

    // Latest entry, shown in the header while collapsed
    const preview = document.createElement('span');
    preview.className = 'log-preview';

    header.append(chevron, titleEl, preview);

    const body = document.createElement('div');
    body.className = 'log-body';

    el.append(header, body);
    container.appendChild(el);

    let isExpanded = expanded;

    function applyExpanded() {
        el.classList.toggle('expanded', isExpanded);
        preview.hidden = isExpanded;
        if (isExpanded) {
            body.scrollTop = body.scrollHeight;
        }
    }

    header.addEventListener('click', () => {
        isExpanded = !isExpanded;
        applyExpanded();
    });

    function pad(n) {
        return String(n).padStart(2, '0');
    }

    function timestamp() {
        const d = new Date();
        return `${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
    }

    // type: 'info' | 'game' | 'player' | 'hit' | 'error'
    function logEvent(message, type = 'info') {
        const entry = document.createElement('div');
        entry.className = `log-entry log-entry-${type}`;

        const time = document.createElement('span');
        time.className = 'log-time';
        time.textContent = timestamp();

        const msg = document.createElement('span');
        msg.className = 'log-msg';
        msg.textContent = message;

        entry.append(time, msg);
        body.appendChild(entry);

        while (body.children.length > MAX_ENTRIES) {
            body.firstChild.remove();
        }

        preview.textContent = message;

        if (isExpanded) {
            body.scrollTop = body.scrollHeight;
        }
    }

    applyExpanded();

    return { element: el, logEvent };
}
