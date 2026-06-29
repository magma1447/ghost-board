// Player management overlay — create, rename, and delete stored players.
//
// Opened from the home screen. Edits the registry in state/players.js. The
// in-game roster picks from these stored players; this is where they live.

import {
    getPlayers, addPlayer, renamePlayer, deletePlayer, nameExists, MAX_NAME_LENGTH,
} from '../state/players.js';

export function openPlayerConfig() {
    const backdrop = document.createElement('div');
    backdrop.className = 'player-config-backdrop';

    const panel = document.createElement('div');
    panel.className = 'player-config';

    const title = document.createElement('h3');
    title.className = 'player-config-title';
    title.textContent = 'Players';
    panel.appendChild(title);

    const list = document.createElement('div');
    list.className = 'player-config-list';
    panel.appendChild(list);

    // UUID of the player awaiting delete confirmation (one at a time)
    let pendingDelete = null;

    // Inline error message (duplicate name, etc.) — placed below the add row
    const errorEl = document.createElement('div');
    errorEl.className = 'player-config-error';
    errorEl.hidden = true;

    function setError(message) {
        errorEl.textContent = message;
        errorEl.hidden = !message;
    }

    // Add-new row
    const addRow = document.createElement('div');
    addRow.className = 'player-config-add';

    const addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.className = 'player-config-input';
    addInput.maxLength = MAX_NAME_LENGTH;
    addInput.placeholder = 'Add player…';
    addInput.addEventListener('input', () => setError(''));

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'player-config-add-btn';
    addBtn.textContent = 'Add';

    function doAdd() {
        const value = addInput.value.trim();
        if (!value) {
            return;
        }
        if (nameExists(value)) {
            setError(`"${value}" already exists`);
            return;
        }
        addPlayer(value);
        addInput.value = '';
        pendingDelete = null;
        setError('');
        renderList();
        addInput.focus();
    }
    addBtn.addEventListener('click', doAdd);
    addInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') {
            e.preventDefault();
            doAdd();
        }
    });

    addRow.append(addInput, addBtn);
    panel.appendChild(addRow);
    panel.appendChild(errorEl);

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'player-config-close';
    closeBtn.textContent = 'Done';
    closeBtn.addEventListener('click', close);
    panel.appendChild(closeBtn);

    function renderList() {
        list.innerHTML = '';
        const players = getPlayers();

        if (players.length === 0) {
            const empty = document.createElement('div');
            empty.className = 'player-config-empty';
            empty.textContent = 'No players yet. Add one below.';
            list.appendChild(empty);
            return;
        }

        for (const p of players) {
            const row = document.createElement('div');
            row.className = 'player-config-row';

            // Pending delete: swap the row for an inline confirmation
            if (pendingDelete === p.uuid) {
                const text = document.createElement('span');
                text.className = 'player-config-confirm-text';
                text.textContent = `Delete "${p.name}"?`;

                const yesBtn = document.createElement('button');
                yesBtn.type = 'button';
                yesBtn.className = 'player-config-confirm-yes';
                yesBtn.textContent = 'Delete';
                yesBtn.addEventListener('click', () => {
                    deletePlayer(p.uuid);
                    pendingDelete = null;
                    setError('');
                    renderList();
                });

                const noBtn = document.createElement('button');
                noBtn.type = 'button';
                noBtn.className = 'player-config-confirm-no';
                noBtn.textContent = 'Cancel';
                noBtn.addEventListener('click', () => {
                    pendingDelete = null;
                    renderList();
                });

                row.append(text, yesBtn, noBtn);
                list.appendChild(row);
                continue;
            }

            const input = document.createElement('input');
            input.type = 'text';
            input.className = 'player-config-input';
            input.maxLength = MAX_NAME_LENGTH;
            input.value = p.name;
            // Save rename on Enter (via blur) or when focus leaves
            input.addEventListener('keydown', (e) => {
                if (e.key === 'Enter') {
                    e.preventDefault();
                    input.blur();
                }
            });
            input.addEventListener('blur', () => {
                const value = input.value.trim();
                if (!value || value === p.name) {
                    input.value = p.name; // revert blanks/no-ops
                    return;
                }
                if (nameExists(value, p.uuid)) {
                    setError(`"${value}" already exists`);
                    input.value = p.name; // revert to the original name
                    return;
                }
                renamePlayer(p.uuid, value);
                p.name = value; // keep the closure in sync (no re-render on blur)
                setError('');
            });

            const delBtn = document.createElement('button');
            delBtn.type = 'button';
            delBtn.className = 'player-config-del';
            delBtn.textContent = '✕';
            delBtn.title = 'Delete player';
            delBtn.addEventListener('click', () => {
                pendingDelete = p.uuid;
                setError('');
                renderList();
            });

            row.append(input, delBtn);
            list.appendChild(row);
        }
    }

    function onKey(e) {
        if (e.key === 'Escape') {
            close();
        }
    }

    function close() {
        document.removeEventListener('keydown', onKey);
        backdrop.remove();
    }

    // Close when clicking the backdrop (but not the panel)
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            close();
        }
    });
    document.addEventListener('keydown', onKey);

    renderList();
    backdrop.appendChild(panel);
    document.body.appendChild(backdrop);
}
