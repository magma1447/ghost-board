// Leg/set history modal for match play. A read-only view of the match state:
// each set with its legs (and who won them) and the set result. Reuses the
// rules modal's backdrop/panel/close styling.

import { createPlayer } from '../state/players.js';

export function openMatchHistory(match) {
    const names = match.playerUuids.map((uuid) => createPlayer(uuid).getName());

    const backdrop = document.createElement('div');
    backdrop.className = 'rules-backdrop';

    const panel = document.createElement('div');
    panel.className = 'rules-panel';

    const body = document.createElement('div');
    body.className = 'match-history-body';

    const title = document.createElement('h3');
    title.className = 'match-history-title';
    title.textContent = 'Match history';
    body.appendChild(title);

    // Chronological log, one line per leg. Leg numbers run within their set;
    // the set is shown only when set play is on.
    const results = match.legResults || [];
    const showSet = match.setsBestOf > 1;
    if (results.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'match-history-empty';
        empty.textContent = 'No legs completed yet.';
        body.appendChild(empty);
    } else {
        const log = document.createElement('div');
        log.className = 'match-history-log';
        const legInSet = {};
        results.forEach((r) => {
            legInSet[r.set] = (legInSet[r.set] || 0) + 1;
            const line = document.createElement('div');
            line.className = 'match-history-line';
            const where = showSet ? `Set ${r.set}, Leg ${legInSet[r.set]}` : `Leg ${legInSet[r.set]}`;
            line.textContent = `${where}: ${names[r.winner]}`;
            log.appendChild(line);
        });
        body.appendChild(log);
    }

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'btn rules-close';
    closeBtn.textContent = 'Close';
    closeBtn.addEventListener('click', close);

    panel.append(body, closeBtn);
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);

    function close() {
        document.removeEventListener('keydown', onKey);
        backdrop.remove();
    }
    function onKey(e) {
        if (e.key === 'Escape') {
            close();
        }
    }
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            close();
        }
    });
    document.addEventListener('keydown', onKey);
}
