// Game selector — the picker's UI: a search box plus player-count and
// scoring-style filters (all on one row), then a collapsible row per game.
// Each row shows the name + badges; clicking it reveals the "Also known as",
// one-liner, and scoring style. Reads the ordered GAMES registry (gentlest
// first). Search + filters combine with AND; the caller supplies onPick (a game
// type was chosen) and onCancel (back out to home).

import './game-selector.css';
import { GAMES } from './registry.js';
import { icons } from '../ui/common/icons.js';

const RATING_MAX = 5; // Play / Rules ratings are drawn as five dots

// Distinct player ranges across the registry, sorted by min then max.
function playerRanges() {
    const seen = new Map(); // "min-max" → {min, max}
    for (const { meta } of GAMES) {
        const { min, max } = meta.players;
        seen.set(`${min}-${max}`, { min, max });
    }
    return [...seen.values()].sort((a, b) => a.min - b.min || a.max - b.max);
}

// Distinct scoring styles across the registry, alphabetical.
function scoringStyles() {
    const seen = new Set();
    for (const { meta } of GAMES) {
        if (meta.scoringStyle) {
            seen.add(meta.scoringStyle);
        }
    }
    return [...seen].sort();
}

// "1–8" for a range, "2" when min === max.
function formatRange({ min, max }) {
    return min === max ? `${min}` : `${min}–${max}`;
}

// Five dots for a rating: `filled` solid, the rest empty (e.g. 4 → ●●●●○).
function ratingDots(container, filled) {
    for (let i = 0; i < RATING_MAX; i += 1) {
        const dot = document.createElement('span');
        dot.className = i < filled ? 'game-selector-dot filled' : 'game-selector-dot';
        dot.textContent = '●';
        container.appendChild(dot);
    }
}

// An icon rating badge: the icon (target for play, book for rules) then its
// five dots. The hover title spells out what the rating means.
function ratingBadge(iconSvg, filled) {
    const badge = document.createElement('span');
    badge.className = 'game-selector-badge game-selector-rating';

    const icon = document.createElement('span');
    icon.className = 'game-selector-rating-icon';
    icon.innerHTML = iconSvg;
    badge.appendChild(icon);

    const dots = document.createElement('span');
    dots.className = 'game-selector-dots';
    ratingDots(dots, filled);
    badge.appendChild(dots);

    return badge;
}

// A collapsible row: header (chevron + name + badges + Play) toggles a details
// block (Also known as + one-liner + scoring style), hidden by default.
function createRow(game, onPick) {
    const { type, label, meta } = game;

    const row = document.createElement('div');
    row.className = 'game-selector-row';

    const header = document.createElement('div');
    header.className = 'game-selector-header';

    const chevron = document.createElement('span');
    chevron.className = 'game-selector-chevron';
    chevron.textContent = '▸';
    header.appendChild(chevron);

    const name = document.createElement('span');
    name.className = 'game-selector-name';
    name.textContent = label;
    header.appendChild(name);

    const badges = document.createElement('div');
    badges.className = 'game-selector-badges';

    const players = document.createElement('span');
    players.className = 'game-selector-badge game-selector-players';
    players.title = 'Number of players supported';
    const icon = document.createElement('span');
    icon.className = 'game-selector-players-icon';
    icon.innerHTML = icons.user; // Lucide person
    const count = document.createElement('span');
    count.textContent = formatRange(meta.players);
    players.append(icon, count);
    badges.appendChild(players);

    const playBadge = ratingBadge(icons.target, meta.playSkill);
    playBadge.title = 'How hard the game is to play well (1 = easy … 5 = hard)';
    badges.appendChild(playBadge);

    const rulesBadge = ratingBadge(icons.bookOpen, meta.rulesComplexity);
    rulesBadge.title = 'How hard the game is to learn (1 = simple … 5 = complex)';
    badges.appendChild(rulesBadge);

    if (meta.scoringStyle) {
        const scoring = document.createElement('span');
        scoring.className = 'game-selector-badge game-selector-scoring';
        scoring.textContent = meta.scoringStyle;
        scoring.title = 'Scoring style';
        badges.appendChild(scoring);
    }
    header.appendChild(badges);

    const play = document.createElement('button');
    play.className = 'btn btn-primary game-selector-play';
    play.textContent = 'Choose'; // goes to the game's setup, not straight into play
    play.addEventListener('click', (e) => {
        e.stopPropagation(); // choose — don't toggle the row
        onPick(type);
    });
    header.appendChild(play);

    row.appendChild(header);

    // Details revealed on click.
    const details = document.createElement('div');
    details.className = 'game-selector-details';
    details.hidden = true;

    const short = document.createElement('div');
    short.className = 'game-selector-short';
    short.textContent = meta.short;
    details.appendChild(short);

    if (meta.aka && meta.aka.length > 0) {
        const aka = document.createElement('div');
        aka.className = 'game-selector-aka';
        aka.textContent = `Also known as: ${meta.aka.join(', ')}`;
        details.appendChild(aka);
    }

    row.appendChild(details);

    header.addEventListener('click', () => {
        const show = details.hidden;
        details.hidden = !show;
        row.classList.toggle('expanded', show);
    });

    return row;
}

// Search matches the label, aka entries, and tags (not the one-liner).
function matchesSearch(game, term) {
    if (!term) {
        return true;
    }
    const haystack = [
        game.label,
        ...(game.meta.aka || []),
        ...(game.meta.tags || []),
    ].join(' ').toLowerCase();
    return haystack.includes(term);
}

// Exact player-range match; a null range (the "Any" option) matches every game.
function matchesPlayers(game, range) {
    if (!range) {
        return true;
    }
    return game.meta.players.min === range.min && game.meta.players.max === range.max;
}

// Scoring-style match; an empty style matches every game.
function matchesScoring(game, style) {
    return !style || game.meta.scoringStyle === style;
}

export function createGameSelector(container, { onPick, onCancel }) {
    const el = document.createElement('div');
    el.className = 'game-selector';

    // -- Controls: search + both filters on one row --
    const controls = document.createElement('div');
    controls.className = 'game-selector-controls';

    const search = document.createElement('input');
    search.type = 'search';
    search.className = 'game-selector-search';
    search.placeholder = 'Search games…';
    controls.appendChild(search);

    const ranges = playerRanges();
    const playerSelect = document.createElement('select');
    playerSelect.className = 'game-selector-filter-select';
    playerSelect.title = 'Players';
    const anyPlayers = document.createElement('option');
    anyPlayers.value = ''; // Any
    anyPlayers.textContent = 'Any players';
    playerSelect.appendChild(anyPlayers);
    ranges.forEach((range, index) => {
        const option = document.createElement('option');
        option.value = String(index); // index into `ranges`
        option.textContent = `${formatRange(range)} players`;
        playerSelect.appendChild(option);
    });
    controls.appendChild(playerSelect);

    const styles = scoringStyles();
    const styleSelect = document.createElement('select');
    styleSelect.className = 'game-selector-filter-select';
    styleSelect.title = 'Scoring style';
    const anyStyle = document.createElement('option');
    anyStyle.value = '';
    anyStyle.textContent = 'Any scoring';
    styleSelect.appendChild(anyStyle);
    for (const style of styles) {
        const option = document.createElement('option');
        option.value = style;
        option.textContent = style;
        styleSelect.appendChild(option);
    }
    controls.appendChild(styleSelect);

    el.appendChild(controls);

    // -- List (+ empty-state line) --
    const list = document.createElement('div');
    list.className = 'game-selector-list';
    el.appendChild(list);

    const empty = document.createElement('div');
    empty.className = 'game-selector-empty';
    empty.textContent = 'No games match';
    empty.hidden = true;
    el.appendChild(empty);

    // Re-render for the current search term + both filters (AND).
    function render() {
        const term = search.value.trim().toLowerCase();
        const rangeValue = playerSelect.value;
        const range = rangeValue === '' ? null : ranges[Number(rangeValue)];
        const style = styleSelect.value;

        list.innerHTML = '';
        const matches = GAMES.filter(
            (game) => matchesSearch(game, term)
                && matchesPlayers(game, range)
                && matchesScoring(game, style),
        );
        for (const game of matches) {
            list.appendChild(createRow(game, onPick));
        }
        empty.hidden = matches.length > 0;
    }

    search.addEventListener('input', render);
    playerSelect.addEventListener('change', render);
    styleSelect.addEventListener('change', render);
    render();

    // -- Cancel --
    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn btn-small btn-danger game-selector-cancel';
    cancelBtn.textContent = 'Cancel';
    cancelBtn.addEventListener('click', () => onCancel());
    el.appendChild(cancelBtn);

    container.appendChild(el);

    function destroy() {
        el.remove();
    }

    return { el, destroy };
}
