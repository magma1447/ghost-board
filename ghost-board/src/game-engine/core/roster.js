// Player roster selector for game setup panels.
//
// Renders either a flat list of players (Individuals) or team cards (2 up to the
// game's max), chosen via a select at the top. Each row selects a player
// (see state/players.js), an inline-added new player, or an AI opponent. A
// player can't be picked twice (across teams either). The selection is bounded
// by each game's [min, max] — which, in team mode, caps the number of TEAMS
// (the game entities); each team then holds any number of members.
//
// A team launches as one synthetic entity (the game sees it as a single shared
// player); the per-member turn layer lives above the game, not here.

import {
    getHumanPlayers, addPlayer, nameExists, getLastPlayers, setLastPlayers,
    createAiPlayer, pruneSyntheticPlayers, isAiPlayer, aiLevelOf, MAX_NAME_LENGTH,
    createTeamPlayer, getLastTeams, setLastTeams,
} from '../../state/players.js';
import { settings, updateSettings } from '../../state/settings.js';
import Sortable from 'sortablejs';
import { icons } from '../../ui/common/icons.js';
// Note: commit() returns the selected player UUIDs (not names) — games store
// the UUID and resolve names via createPlayer().getName().

const NEW_PLAYER = '__new__';
const AI_MIN_LEVEL = 1;
const AI_MAX_LEVEL = 10;
const MAX_TEAM_MEMBERS = 8; // a generous UI guard, not a fun-police rule

// A row is a player UUID string, '' (unchosen), NEW_PLAYER (adding a name), or
// an AI descriptor { ai: true, level }.
function isAiRow(sel) {
    return Boolean(sel && sel.ai);
}

function isPicked(sel) {
    return isAiRow(sel) || (typeof sel === 'string' && sel && sel !== NEW_PLAYER);
}

function defaultTeamName(index) {
    return String.fromCharCode(65 + index); // A, B, C, D — shown after the "Team" label
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
    // Rebuild a stored row: a human by UUID (dropped if since deleted), or an AI
    // level row (dropped when the game doesn't support AI).
    function seedEntry(uuid) {
        if (isAiPlayer(uuid)) {
            const level = aiLevelOf(uuid);
            return supportsAi && level !== null ? { ai: true, level } : null;
        }
        return getHumanPlayers().some((p) => p.uuid === uuid) ? uuid : null;
    }

    const seeded = getLastPlayers().map(seedEntry).filter((entry) => entry !== null);
    const initialCount = seeded.length > 0
        ? Math.min(Math.max(seeded.length, min), max)
        : Math.min(Math.max(2, min), max);

    // Individuals: a flat list of rows (a UUID / '' / NEW_PLAYER / AI descriptor).
    const individual = [];
    for (let i = 0; i < initialCount; i++) {
        individual.push(seeded[i] || '');
    }

    // Team mode: teamCount is 1 (Individuals) or 2..maxTeams. A team is one of
    // the game's entities, so the count is bounded by the game's own max (no
    // separate cap). `teams` is only populated while teamCount >= 2.
    const maxTeams = max;
    let teamCount = 1;
    let teams = []; // [{ name, members: [row, ...] }]

    // Re-seed a saved team night so it carries over between games.
    const lastTeams = getLastTeams();
    if (maxTeams >= 2 && lastTeams.length >= 2) {
        teamCount = Math.min(lastTeams.length, maxTeams);
        teams = lastTeams.slice(0, teamCount).map((t) => ({
            name: t.name,
            members: (t.members || []).map(seedEntry).filter((entry) => entry !== null),
        }));
    }

    // Only flag empty rows after a failed Start attempt, not on first render
    let showErrors = false;

    // Active SortableJS instances (one per row list) — rebuilt each render.
    let sortables = [];

    const el = document.createElement('div');
    el.className = 'game-roster';

    // -- Individuals / N teams selector (only if the game can field teams) --
    const modeWrap = document.createElement('div');
    modeWrap.className = 'game-roster-mode';
    const modeSelect = document.createElement('select');
    modeSelect.className = 'game-roster-select game-roster-mode-select';
    {
        const opt = document.createElement('option');
        opt.value = '1';
        opt.textContent = 'Individuals';
        modeSelect.appendChild(opt);
        for (let c = 2; c <= maxTeams; c++) {
            const o = document.createElement('option');
            o.value = String(c);
            o.textContent = `${c} teams`;
            modeSelect.appendChild(o);
        }
    }
    modeSelect.addEventListener('change', () => setTeamCount(Number(modeSelect.value)));
    modeWrap.appendChild(modeSelect);
    el.appendChild(modeWrap);

    const rows = document.createElement('div');
    rows.className = 'game-roster-rows';
    el.appendChild(rows);

    // Add buttons sit at the top level for both modes. In team mode they add to
    // the emptiest team (first on a tie); drag the row to another team to override.
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'game-roster-add';
    addBtn.textContent = '+ Add player';
    addBtn.addEventListener('click', () => addEntry(''));

    const addAiBtn = document.createElement('button');
    addAiBtn.type = 'button';
    addAiBtn.className = 'game-roster-add game-roster-add-ai';
    addAiBtn.textContent = '+ Add AI (beta)';
    addAiBtn.addEventListener('click', () => addEntry({ ai: true, level: settings().ai.level }));

    // Teams-only: deal everyone currently in the roster across the teams at random.
    // Sits at the right of the controls row, mirroring the individuals Order buttons.
    const shuffleBtn = document.createElement('button');
    shuffleBtn.type = 'button';
    shuffleBtn.className = 'game-roster-add game-roster-shuffle';
    shuffleBtn.textContent = 'Shuffle teams';
    shuffleBtn.addEventListener('click', shuffleTeams);

    // Quick reorder controls (individuals). Row dropdowns already set explicit
    // play order (row 1 throws first); these are shortcuts on top of that.
    const orderBar = document.createElement('div');
    orderBar.className = 'game-roster-order';

    const controls = document.createElement('div');
    controls.className = 'game-roster-controls';
    controls.append(addBtn, addAiBtn, shuffleBtn, orderBar);
    el.appendChild(controls);

    // -- Shared helpers over whichever lists are active --

    // The row lists currently in play: the flat list, or each team's members.
    function currentLists() {
        return teamCount === 1 ? [individual] : teams.map((t) => t.members);
    }

    // Every picked human/AI across the active lists (order = throw order).
    function collectPicks() {
        const picks = [];
        for (const list of currentLists()) {
            for (const sel of list) {
                if (isPicked(sel)) {
                    picks.push(sel);
                }
            }
        }
        return picks;
    }

    // The team with the fewest members (first on a tie) — where a top-level add
    // lands, so empty/smaller teams fill first and the sides stay balanced.
    function emptiestTeam() {
        return teams.reduce((best, t) => (t.members.length < best.members.length ? t : best), teams[0]);
    }

    // Human UUIDs picked anywhere except (list, exceptIndex) — a person can't be
    // on two rows, across teams included.
    function takenExcept(list, exceptIndex) {
        const taken = new Set();
        for (const l of currentLists()) {
            for (let i = 0; i < l.length; i++) {
                if (l === list && i === exceptIndex) {
                    continue;
                }
                const sel = l[i];
                if (typeof sel === 'string' && sel && sel !== NEW_PLAYER) {
                    taken.add(sel);
                }
            }
        }
        return taken;
    }

    // Switch between Individuals (1) and N teams, keeping the people already
    // chosen: dealt round-robin into the new teams, or flattened back to the list.
    function setTeamCount(n) {
        const picks = collectPicks();
        if (n === 1) {
            individual.length = 0;
            picks.forEach((p) => individual.push(p));
            while (individual.length < Math.max(1, min)) {
                individual.push('');
            }
        } else {
            const next = [];
            for (let i = 0; i < n; i++) {
                next.push({ name: (teams[i] && teams[i].name) || defaultTeamName(i), members: [] });
            }
            picks.forEach((p, idx) => next[idx % n].members.push(p));
            teams = next;
        }
        teamCount = n;
        showErrors = false;
        render();
    }

    function shuffleTeams() {
        const picks = reorderUuids(collectPicks(), 'randomize');
        teams.forEach((t) => {
            t.members = [];
        });
        picks.forEach((p, idx) => teams[idx % teamCount].members.push(p));
        showErrors = false;
        render();
    }

    // -- Row builders (operate on a given list + index) --

    function buildSelect(list, i) {
        const wrap = document.createElement('div');
        wrap.className = 'game-roster-player';

        const role = document.createElement('span');
        role.className = 'game-roster-role';
        role.textContent = 'Player';

        const select = document.createElement('select');
        select.className = 'game-roster-select';
        if (showErrors && !list[i]) {
            select.classList.add('game-roster-error');
        }

        const placeholder = document.createElement('option');
        placeholder.value = '';
        placeholder.textContent = '— Select player —';
        select.appendChild(placeholder);

        const taken = takenExcept(list, i);
        for (const p of getHumanPlayers()) {
            // Skip players chosen elsewhere, but keep this row's own pick
            if (taken.has(p.uuid) && p.uuid !== list[i]) {
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

        select.value = list[i];
        select.addEventListener('change', () => {
            list[i] = select.value;
            showErrors = false;
            render();
        });
        wrap.append(role, select);
        return wrap;
    }

    // AI opponent row — a difficulty (level) picker in the player-name slot.
    function buildAiRow(list, i) {
        const wrap = document.createElement('div');
        wrap.className = 'game-roster-ai';

        const badge = document.createElement('span');
        badge.className = 'game-roster-role';
        badge.textContent = 'AI';

        const select = document.createElement('select');
        select.className = 'game-roster-select';
        for (let level = AI_MIN_LEVEL; level <= AI_MAX_LEVEL; level++) {
            const opt = document.createElement('option');
            opt.value = String(level);
            opt.textContent = `Level ${level}`;
            select.appendChild(opt);
        }
        select.value = String(list[i].level);
        select.addEventListener('change', () => {
            const level = Number(select.value);
            list[i].level = level;
            updateSettings('ai.level', level); // default for the next Add AI
        });

        wrap.append(badge, select);
        return wrap;
    }

    // Inline "new player" name entry, shown when NEW_PLAYER is chosen
    function buildNewInput(list, i) {
        const wrap = document.createElement('div');
        wrap.className = 'game-roster-new';

        const role = document.createElement('span');
        role.className = 'game-roster-role';
        role.textContent = 'Player';

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
            list[i] = player ? player.uuid : '';
            render();
        }
        function cancel() {
            list[i] = '';
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

        wrap.append(role, input, okBtn, cancelBtn);
        // Focus the field once it's in the DOM
        setTimeout(() => input.focus(), 0);
        return wrap;
    }

    // Remove ✕ — down to a single row so a slot can always be rebuilt (e.g. swap
    // an AI for a human); Start stays blocked below the minimum (#81).
    function appendRemove(row, list, i) {
        if (list.length > 1) {
            const removeBtn = document.createElement('button');
            removeBtn.type = 'button';
            removeBtn.className = 'btn btn-icon btn-danger';
            removeBtn.textContent = '✕';
            removeBtn.title = 'Remove';
            removeBtn.addEventListener('click', () => {
                list.splice(i, 1);
                showErrors = false;
                render();
            });
            row.appendChild(removeBtn);
        }
    }

    // Drag handle — the far-left grip. Only committed rows (a player or AI) get
    // one, so the transient new-player input can't be dragged mid-entry.
    function buildGrip() {
        const grip = document.createElement('span');
        grip.className = 'game-roster-grip';
        grip.title = 'Drag to reorder';
        grip.innerHTML = icons.gripVertical;
        return grip;
    }

    function buildRow(list, i) {
        const row = document.createElement('div');
        row.className = 'game-roster-row';
        if (isAiRow(list[i])) {
            row.append(buildGrip(), buildAiRow(list, i));
            appendRemove(row, list, i);
        } else if (list[i] === NEW_PLAYER) {
            row.appendChild(buildNewInput(list, i));
        } else {
            row.append(buildGrip(), buildSelect(list, i));
            appendRemove(row, list, i);
        }
        return row;
    }

    // A team card: editable name + member rows. Adds happen via the shared
    // top-level buttons, which target the emptiest team.
    function buildTeamCard(team) {
        const card = document.createElement('div');
        card.className = 'game-roster-team';

        const header = document.createElement('div');
        header.className = 'game-roster-team-header';
        const teamLabel = document.createElement('span');
        teamLabel.className = 'game-roster-role';
        teamLabel.textContent = 'Team';
        const nameInput = document.createElement('input');
        nameInput.type = 'text';
        nameInput.className = 'game-roster-input game-roster-team-name';
        nameInput.maxLength = MAX_NAME_LENGTH;
        nameInput.value = team.name;
        nameInput.addEventListener('input', () => {
            team.name = nameInput.value;
        });
        header.append(teamLabel, nameInput);
        card.appendChild(header);

        const memberRows = document.createElement('div');
        memberRows.className = 'game-roster-rows';
        for (let i = 0; i < team.members.length; i++) {
            memberRows.appendChild(buildRow(team.members, i));
        }
        card.appendChild(memberRows);
        return card;
    }

    // -- Drag-and-drop reordering (SortableJS) --
    // The grip is the drag handle; every list shares one group, so a row moves
    // within a team, between teams, and in the flat roster. On drop we mirror the
    // move into the backing array (stashed on the container) and re-render.
    function destroySortables() {
        sortables.forEach((s) => s.destroy());
        sortables = [];
    }

    function makeSortable(container, list) {
        container._rosterList = list;
        sortables.push(Sortable.create(container, {
            group: 'roster',
            handle: '.game-roster-grip',
            animation: 150,
            onEnd: onDragEnd,
        }));
    }

    function attachSortables() {
        if (teamCount === 1) {
            makeSortable(rows, individual);
        } else {
            rows.querySelectorAll('.game-roster-team').forEach((card, ti) => {
                makeSortable(card.querySelector('.game-roster-rows'), teams[ti].members);
            });
        }
    }

    function onDragEnd(evt) {
        const fromList = evt.from._rosterList;
        const toList = evt.to._rosterList;
        if (!fromList || !toList) {
            return;
        }
        const [moved] = fromList.splice(evt.oldIndex, 1);
        toList.splice(evt.newIndex, 0, moved);
        // A team may be left empty (e.g. you'll add AI to it) — no placeholder is
        // forced in; Start blocks empty teams instead.
        showErrors = false;
        render();
    }

    // Add a row via the top-level buttons: to the flat list, or (team mode) the
    // emptiest team. The new row flashes so it's obvious where it landed.
    function addEntry(entry) {
        if (teamCount === 1) {
            if (individual.length >= max) {
                return;
            }
            individual.push(entry);
            showErrors = false;
            render();
            flashRow(rows.lastElementChild);
            return;
        }
        const team = emptiestTeam();
        if (team.members.length >= MAX_TEAM_MEMBERS) {
            return;
        }
        team.members.push(entry);
        showErrors = false;
        render();
        const card = rows.querySelectorAll('.game-roster-team')[teams.indexOf(team)];
        if (card) {
            flashRow(card.querySelector('.game-roster-rows').lastElementChild);
        }
    }

    function flashRow(rowEl) {
        if (!rowEl) {
            return;
        }
        rowEl.scrollIntoView({ block: 'nearest' });
        rowEl.classList.add('game-roster-flash');
        rowEl.addEventListener('animationend', () => {
            rowEl.classList.remove('game-roster-flash');
        }, { once: true });
    }

    function renderOrderBar() {
        orderBar.innerHTML = '';
        const active = teamCount === 1 && individual.length >= 2;
        orderBar.hidden = !active;
        if (!active) {
            return;
        }
        const label = document.createElement('span');
        label.className = 'game-roster-order-label';
        label.textContent = 'Order';
        orderBar.appendChild(label);

        const ops = individual.length === 2
            ? [['Randomize', 'randomize'], ['Swap', 'swap']]
            : [['Randomize', 'randomize'], ['Rotate', 'rotate'], ['Reverse', 'reverse']];
        for (const [text, op] of ops) {
            const orderBtn = document.createElement('button');
            orderBtn.type = 'button';
            orderBtn.className = 'btn btn-small';
            orderBtn.textContent = text;
            orderBtn.addEventListener('click', () => {
                individual.splice(0, individual.length, ...reorderUuids(individual, op));
                showErrors = false;
                render();
            });
            orderBar.appendChild(orderBtn);
        }
    }

    function reportChange() {
        if (!onChange) {
            return;
        }
        if (teamCount === 1) {
            const count = individual.length;
            const canStart = count >= min;
            onChange({
                summary: `${count} player${count === 1 ? '' : 's'}`,
                canStart,
                note: canStart ? '' : `Needs at least ${min} players.`,
            });
        } else {
            const people = collectPicks().length;
            const emptyTeam = teams.some((t) => !t.members.some(isPicked));
            onChange({
                summary: `${teamCount} teams · ${people} player${people === 1 ? '' : 's'}`,
                canStart: !emptyTeam,
                note: emptyTeam ? 'Every team needs at least one player.' : '',
            });
        }
    }

    function render() {
        destroySortables();
        modeWrap.hidden = maxTeams < 2;
        modeSelect.value = String(teamCount);

        rows.innerHTML = '';
        if (teamCount === 1) {
            for (let i = 0; i < individual.length; i++) {
                rows.appendChild(buildRow(individual, i));
            }
        } else {
            teams.forEach((team) => rows.appendChild(buildTeamCard(team)));
        }
        attachSortables();

        const individuals = teamCount === 1;
        const full = individuals
            ? individual.length >= max
            : emptiestTeam().members.length >= MAX_TEAM_MEMBERS;
        addBtn.hidden = full;
        addAiBtn.hidden = !supportsAi || full;
        shuffleBtn.hidden = individuals;
        renderOrderBar();

        // Reserve the ✕-column on the right of the controls row only when
        // individual rows actually have remove buttons (so Order aligns).
        el.classList.toggle('roster-has-remove', individuals && individual.length > 1);

        reportChange();
    }

    render();
    container.appendChild(el);

    function completeCount() {
        return individual.filter(isPicked).length;
    }

    // Persist the selection and return the player UUIDs for launch — team UUIDs
    // in team mode, human/AI UUIDs otherwise. Returns null (flagging the offending
    // rows) if the selection is incomplete.
    function commit() {
        return teamCount === 1 ? commitIndividuals() : commitTeams();
    }

    function commitIndividuals() {
        const incomplete = individual.some((s) => !isAiRow(s) && (!s || s === NEW_PLAYER));
        if (incomplete || completeCount() < min) {
            showErrors = true;
            render();
            return null;
        }
        let aiCount = 0;
        const uuids = individual.map((s) => {
            if (isAiRow(s)) {
                aiCount += 1;
                return createAiPlayer(aiCount, s.level).uuid;
            }
            return s;
        });
        pruneSyntheticPlayers(uuids); // drop synthetic players from previous games
        setLastPlayers(uuids); // remember the whole line-up, AIs included
        setLastTeams([]); // last mode was individuals
        return uuids;
    }

    // Mint one synthetic entity per team (the game sees these as its players),
    // named "Team <label>", and remember the line-up so the night carries over.
    function commitTeams() {
        const incomplete = teams.some((t) => t.members.some((s) => !isAiRow(s) && (!s || s === NEW_PLAYER)));
        const emptyTeam = teams.some((t) => !t.members.some(isPicked));
        if (incomplete || emptyTeam) {
            showErrors = true;
            render();
            return null;
        }
        let aiCount = 0;
        const teamUuids = [];
        const savedTeams = [];
        const keep = [];
        teams.forEach((t, index) => {
            const memberUuids = t.members.map((s) => {
                if (isAiRow(s)) {
                    aiCount += 1;
                    return createAiPlayer(aiCount, s.level).uuid;
                }
                return s;
            });
            const label = (t.name || '').trim() || defaultTeamName(index);
            const team = createTeamPlayer(`Team ${label}`, memberUuids);
            teamUuids.push(team.uuid);
            savedTeams.push({ name: label, members: memberUuids });
            keep.push(team.uuid, ...memberUuids);
        });
        pruneSyntheticPlayers(keep); // drop AI/team entities from previous games
        setLastTeams(savedTeams); // remember the team night
        return teamUuids;
    }

    function destroy() {
        destroySortables();
        el.remove();
    }

    return { commit, destroy };
}
