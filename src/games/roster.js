// Player roster selector for game setup panels.
//
// Renders a list of dropdowns, each selecting a stored player from the
// registry (see state/players.js). Players can be added inline ("＋ New
// player…"), the row count adjusted via add/remove, and a player can't be
// picked twice. The selection is bounded by each game's [min, max] and
// pre-filled from the last-used players. Fixed-count games (Cat and Mouse)
// pass min === max === 2.

import {
    getPlayers, addPlayer, nameExists, getLastPlayers, setLastPlayers, MAX_NAME_LENGTH,
} from '../state/players.js';
// Note: commit() returns the selected player UUIDs (not names) — games store
// the UUID and resolve names via createPlayer().getName().

const NEW_PLAYER = '__new__';

export function createPlayerRoster(container, { min = 1, max = 8 } = {}) {
    const seeded = getLastPlayers().filter(
        (uuid) => getPlayers().some((p) => p.uuid === uuid),
    );
    const initialCount = seeded.length > 0
        ? Math.min(Math.max(seeded.length, min), max)
        : Math.min(Math.max(2, min), max);

    // selection[i] is a player UUID, '' (none chosen), or NEW_PLAYER (adding)
    const selection = [];
    for (let i = 0; i < initialCount; i++) {
        selection.push(seeded[i] || '');
    }

    // Only flag empty rows after a failed Start attempt, not on first render
    let showErrors = false;

    const el = document.createElement('div');
    el.className = 'game-roster';

    const title = document.createElement('div');
    title.className = 'game-roster-title';
    title.textContent = 'Players';
    el.appendChild(title);

    const rows = document.createElement('div');
    rows.className = 'game-roster-rows';
    el.appendChild(rows);

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'game-roster-add';
    addBtn.textContent = '+ Add player';
    addBtn.addEventListener('click', () => {
        if (selection.length < max) {
            selection.push('');
            showErrors = false;
            render();
        }
    });
    el.appendChild(addBtn);

    // UUIDs picked in rows other than `exceptIndex` (to prevent duplicates)
    function takenElsewhere(exceptIndex) {
        const taken = new Set();
        for (let i = 0; i < selection.length; i++) {
            if (i !== exceptIndex && selection[i] && selection[i] !== NEW_PLAYER) {
                taken.add(selection[i]);
            }
        }
        return taken;
    }

    function buildSelect(i) {
        const select = document.createElement('select');
        select.className = 'game-roster-select';
        if (showErrors && !selection[i]) {
            select.classList.add('game-roster-error');
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '— Select player —';
        select.appendChild(placeholder);

        const taken = takenElsewhere(i);
        for (const p of getPlayers()) {
            // Skip players chosen in other rows, but keep this row's own pick
            if (taken.has(p.uuid) && p.uuid !== selection[i]) {
                continue;
            }
            const opt = document.createElement('option');
            opt.value = p.uuid;
            opt.textContent = p.name;
            select.appendChild(opt);
        }

        const newOpt = document.createElement('option');
        newOpt.value = NEW_PLAYER;
        newOpt.textContent = '＋ New player…';
        select.appendChild(newOpt);

        select.value = selection[i];
        select.addEventListener('change', () => {
            selection[i] = select.value;
            showErrors = false;
            render();
        });
        return select;
    }

    // Inline "new player" name entry, shown when NEW_PLAYER is chosen
    function buildNewInput(i) {
        const wrap = document.createElement('div');
        wrap.className = 'game-roster-new';

        const input = document.createElement('input');
        input.type = 'text';
        input.className = 'game-roster-input';
        input.maxLength = MAX_NAME_LENGTH;
        input.placeholder = 'New player name';
        // Clear the duplicate-name flag as soon as the user edits
        input.addEventListener('input', () => {
            input.classList.remove('game-roster-error');
            input.title = '';
        });

        function confirm() {
            if (nameExists(input.value)) {
                input.classList.add('game-roster-error');
                input.title = 'A player with this name already exists';
                return; // keep the field open so they can fix it
            }
            const player = addPlayer(input.value);
            selection[i] = player ? player.uuid : '';
            render();
        }
        function cancel() {
            selection[i] = '';
            render();
        }

        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                confirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });

        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'btn btn-icon btn-primary';
        okBtn.textContent = '✓';
        okBtn.addEventListener('click', confirm);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-icon btn-danger';
        cancelBtn.textContent = '✕';
        cancelBtn.addEventListener('click', cancel);

        wrap.append(input, okBtn, cancelBtn);
        // Focus the field once it's in the DOM
        setTimeout(() => input.focus(), 0);
        return wrap;
    }

    function render() {
        rows.innerHTML = '';
        for (let i = 0; i < selection.length; i++) {
            const row = document.createElement('div');
            row.className = 'game-roster-row';

            if (selection[i] === NEW_PLAYER) {
                row.appendChild(buildNewInput(i));
            } else {
                row.appendChild(buildSelect(i));

                // Remove button only when above the minimum count
                if (selection.length > min) {
                    const removeBtn = document.createElement('button');
                    removeBtn.type = 'button';
                    removeBtn.className = 'btn btn-icon btn-danger';
                    removeBtn.textContent = '✕';
                    removeBtn.title = 'Remove player';
                    removeBtn.addEventListener('click', () => {
                        selection.splice(i, 1);
                        showErrors = false;
                        render();
                    });
                    row.appendChild(removeBtn);
                }
            }

            rows.appendChild(row);
        }
        // Hide add button at max (and for fixed-count games where min === max)
        addBtn.hidden = selection.length >= max;
    }

    render();
    container.appendChild(el);

    function selectedUuids() {
        return selection.filter((s) => s && s !== NEW_PLAYER);
    }

    // Persist the selection and return the chosen player UUIDs for launch.
    // Returns null (and flags empty rows) if fewer than `min` are selected.
    function commit() {
        const uuids = selectedUuids();
        if (uuids.length < min) {
            showErrors = true;
            render();
            return null;
        }
        setLastPlayers(uuids);
        return uuids;
    }

    function destroy() {
        el.remove();
    }

    return { commit, destroy };
}
