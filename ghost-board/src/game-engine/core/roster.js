// Player roster selector for game setup panels.
//
// Renders a list of dropdowns, each selecting a stored player from the
// registry (see state/players.js). Players can be added inline ("＋ New
// player…"), the row count adjusted via add/remove, and a player can't be
// picked twice. The selection is bounded by each game's [min, max] and
// pre-filled from the last-used players. Fixed-count games (Cat and Mouse)
// pass min === max === 2.

import {
    getHumanPlayers, addPlayer, nameExists, getLastPlayers, setLastPlayers,
    createAiPlayer, pruneAiPlayers, isAiPlayer, aiLevelOf, MAX_NAME_LENGTH,
} from '../../state/players.js';
import { settings, updateSettings } from '../../state/settings.js';
// Note: commit() returns the selected player UUIDs (not names) — games store
// the UUID and resolve names via createPlayer().getName().

const NEW_PLAYER = '__new__';
const AI_MIN_LEVEL = 1;
const AI_MAX_LEVEL = 10;

// A row is a player UUID string, '' (unchosen), NEW_PLAYER (adding a name), or
// an AI descriptor { ai: true, level }.
function isAiRow(sel) {
    return Boolean(sel && sel.ai);
}

// Pure reorder of a player-UUID list, returning a NEW array (the input is left
// untouched). Shared by the setup roster's Order controls and the in-game
// Rematch menu so both apply the same ordering.
//   'keep'      — unchanged
//   'rotate'    — last becomes first: A,B,C -> C,A,B
//   'reverse' / 'swap' — reversed order
//   'randomize' — Fisher–Yates shuffle
export function reorderUuids(uuids, op) {
    const result = [...uuids];
    if (op === 'swap' || op === 'reverse') {
        result.reverse();
    } else if (op === 'rotate' && result.length > 0) {
        result.unshift(result.pop());
    } else if (op === 'randomize') {
        for (let i = result.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [result[i], result[j]] = [result[j], result[i]];
        }
    }
    return result;
}

export function createPlayerRoster(container, { min = 1, max = 8, supportsAi = false } = {}, onChange = null) {
    // Rebuild the last line-up: humans by uuid, AIs as level rows. Drop entries
    // that no longer resolve (deleted human), and AI rows when the game doesn't
    // support them.
    const seeded = getLastPlayers()
        .map((uuid) => {
            if (isAiPlayer(uuid)) {
                const level = aiLevelOf(uuid);
                return supportsAi && level !== null ? { ai: true, level } : null;
            }
            return getHumanPlayers().some((p) => p.uuid === uuid) ? uuid : null;
        })
        .filter((entry) => entry !== null);
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

    // Add AI opponent (games that support it) — a row with a level picker.
    const addAiBtn = document.createElement('button');
    addAiBtn.type = 'button';
    addAiBtn.className = 'game-roster-add game-roster-add-ai';
    addAiBtn.textContent = '+ Add AI (beta)';
    addAiBtn.addEventListener('click', () => {
        if (selection.length < max) {
            selection.push({ ai: true, level: settings().ai.level });
            showErrors = false;
            render();
        }
    });
    // Quick reorder controls. The row dropdowns already set explicit play
    // order (row 1 throws first); these are shortcuts on top of that.
    const orderBar = document.createElement('div');
    orderBar.className = 'game-roster-order';

    // Add player (left) and the order controls (right) share one row
    const controls = document.createElement('div');
    controls.className = 'game-roster-controls';
    controls.append(addBtn, addAiBtn, orderBar);
    el.appendChild(controls);

    function applyOrder(op) {
        selection.splice(0, selection.length, ...reorderUuids(selection, op));
        showErrors = false;
        render();
    }

    // UUIDs picked in rows other than `exceptIndex` (to prevent duplicates)
    function takenElsewhere(exceptIndex) {
        const taken = new Set();
        for (let i = 0; i < selection.length; i++) {
            const sel = selection[i];
            if (i !== exceptIndex && typeof sel === 'string' && sel && sel !== NEW_PLAYER) {
                taken.add(sel);
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
        for (const p of getHumanPlayers()) {
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

    // AI opponent row — a difficulty (level) picker in the player-name slot.
    function buildAiRow(i) {
        const wrap = document.createElement('div');
        wrap.className = 'game-roster-ai';

        const badge = document.createElement('span');
        badge.className = 'game-roster-ai-badge';
        badge.textContent = 'AI';

        const select = document.createElement('select');
        select.className = 'game-roster-select';
        for (let level = AI_MIN_LEVEL; level <= AI_MAX_LEVEL; level++) {
            const opt = document.createElement('option');
            opt.value = String(level);
            opt.textContent = `Level ${level}`;
            select.appendChild(opt);
        }
        select.value = String(selection[i].level);
        select.addEventListener('change', () => {
            const level = Number(select.value);
            selection[i].level = level;
            updateSettings('ai.level', level); // default for the next Add AI
        });

        wrap.append(badge, select);
        return wrap;
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

    function appendRemove(row, i) {
        // Removable down to a single row — never a dead-end, even for
        // fixed-count games (min === max). Dropping below min re-enables the add
        // buttons so a slot can be rebuilt (e.g. swap an AI for a human); Start
        // stays blocked until min is met again (#81).
        if (selection.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-icon btn-danger';
            removeBtn.textContent = '✕';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', () => {
                selection.splice(i, 1);
                showErrors = false;
                render();
            });
            row.appendChild(removeBtn);
        }
    }

    function render() {
        rows.innerHTML = '';
        for (let i = 0; i < selection.length; i++) {
            const row = document.createElement('div');
            row.className = 'game-roster-row';

            if (isAiRow(selection[i])) {
                row.appendChild(buildAiRow(i));
                appendRemove(row, i);
            } else if (selection[i] === NEW_PLAYER) {
                row.appendChild(buildNewInput(i));
            } else {
                row.appendChild(buildSelect(i));
                appendRemove(row, i);
            }

            rows.appendChild(row);
        }
        // Hide add buttons at max (and for fixed-count games where min === max)
        addBtn.hidden = selection.length >= max;
        addAiBtn.hidden = !supportsAi || selection.length >= max;
        // Reserve the ✕-column on the right of the controls row only when
        // rows actually have remove buttons (so Order aligns with the selects)
        el.classList.toggle('roster-has-remove', selection.length > 1);

        // Reorder controls — Swap at 2 players, the trio at 3+, none at 1
        orderBar.innerHTML = '';
        orderBar.hidden = selection.length < 2;
        if (selection.length >= 2) {
            const label = document.createElement('span');
            label.className = 'game-roster-order-label';
            label.textContent = 'Order';
            orderBar.appendChild(label);

            const ops = selection.length === 2
                ? [['Randomize', 'randomize'], ['Swap', 'swap']]
                : [['Randomize', 'randomize'], ['Rotate', 'rotate'], ['Reverse', 'reverse']];
            for (const [text, op] of ops) {
                const orderBtn = document.createElement('button');
                orderBtn.type = 'button';
                orderBtn.className = 'btn btn-small';
                orderBtn.textContent = text;
                orderBtn.addEventListener('click', () => applyOrder(op));
                orderBar.appendChild(orderBtn);
            }
        }

        // Report the player count so the host can show it in the section summary
        if (onChange) {
            onChange(selection.length);
        }
    }

    render();
    container.appendChild(el);

    function completeCount() {
        return selection.filter((s) => isAiRow(s) || (s && s !== NEW_PLAYER)).length;
    }

    // Persist the selection and return the chosen player UUIDs for launch. AI
    // rows become fresh AI opponents (numbered AI #1, #2, …). Returns null (and
    // flags the offending rows) if a human row is empty or fewer than `min`
    // players are chosen.
    function commit() {
        const incomplete = selection.some((s) => !isAiRow(s) && (!s || s === NEW_PLAYER));
        if (incomplete || completeCount() < min) {
            showErrors = true;
            render();
            return null;
        }
        let aiCount = 0;
        const uuids = selection.map((s) => {
            if (isAiRow(s)) {
                aiCount += 1;
                return createAiPlayer(aiCount, s.level).uuid;
            }
            return s;
        });
        pruneAiPlayers(uuids); // drop AI opponents left over from previous games
        setLastPlayers(uuids); // remember the whole line-up, AIs included
        return uuids;
    }

    function destroy() {
        el.remove();
    }

    return { commit, destroy };
}
