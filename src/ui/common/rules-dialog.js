// Full game-rules modal. Renders a markdown string (the game's rules.md,
// imported via ?raw) to HTML with marked and shows it in an overlay. The
// markdown is authored by us, so rendering it as innerHTML is safe.

import { marked } from 'marked';

export function openRules(markdownText) {
    const backdrop = document.createElement('div');
    backdrop.className = 'rules-backdrop';

    const panel = document.createElement('div');
    panel.className = 'rules-panel';

    const body = document.createElement('div');
    body.className = 'rules-body';
    body.innerHTML = marked.parse(markdownText);

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
