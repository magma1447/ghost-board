// Shared in-game panel factory.
//
// Every game panel has the same shell — a rules summary line, a round
// indicator, a scoreboard, an event banner, and Next Player / End Game
// buttons. createGamePanel() builds that shell and returns the element refs so
// a game can add its own extras (e.g. Simon's target line, Cat and Mouse's gap
// line) by inserting before scoreboard/banner.
//
// renderScoreboard() draws the per-player blocks, parameterized for the few
// things that differ between games (name, value text, which darts to show, and
// total-vs-hit/miss dart rendering).

import './game-panel.css';
import '../../ui/common/menu.css';
import { formatDart } from '../shared/format.js';
import { createPlayer, teamMembersOf } from '../../state/players.js';
import { isMatchPlay, matchPositionLabel, playerMatchLabel, matchRanks } from './match.js';
import { openMatchHistory } from '../../ui/match-history.js';
import { openRules } from '../../ui/common/rules-dialog.js';
import { attachDropdown } from '../../ui/common/dropdown.js';

export function createGamePanel(container, { onNextPlayer, onEndGame, onRematch, onUndo }, { title = '', rulesMd = '', drawMessage = 'Draw' } = {}) {
    const el = document.createElement('div');
    el.className = 'game-panel';

    // Header — game name (left) + Rules button (right), mirroring the setup card
    const header = document.createElement('div');
    header.className = 'game-header';

    const headerTitle = document.createElement('span');
    headerTitle.className = 'game-header-title';
    headerTitle.textContent = title;
    header.appendChild(headerTitle);

    if (rulesMd) {
        const rulesBtn = document.createElement('button');
        rulesBtn.type = 'button';
        rulesBtn.className = 'btn btn-small game-header-rules';
        rulesBtn.textContent = 'Rules';
        rulesBtn.addEventListener('click', () => openRules(rulesMd));
        header.appendChild(rulesBtn);
    }

    el.appendChild(header);

    // Rules summary
    const rulesLabel = document.createElement('div');
    rulesLabel.className = 'game-rules';
    el.appendChild(rulesLabel);

    // Round indicator
    const roundLabel = document.createElement('div');
    roundLabel.className = 'game-round';
    el.appendChild(roundLabel);

    // Scoreboard
    const scoreboard = document.createElement('div');
    scoreboard.className = 'game-scoreboard';
    el.appendChild(scoreboard);

    // Event banner (bust / win / draw)
    const banner = document.createElement('div');
    banner.className = 'game-banner';
    banner.hidden = true;
    el.appendChild(banner);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'game-buttons';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'btn btn-block';
    nextBtn.textContent = 'Next Player';
    nextBtn.addEventListener('click', onNextPlayer);

    // Undo the last dart/switch — disabled when there's nothing to undo
    const undoBtn = document.createElement('button');
    undoBtn.className = 'btn';
    undoBtn.textContent = 'Undo';
    undoBtn.disabled = true;
    undoBtn.addEventListener('click', () => onUndo && onUndo());

    const endBtn = document.createElement('button');
    endBtn.className = 'btn btn-danger';
    endBtn.textContent = 'End Game';
    endBtn.addEventListener('click', onEndGame);

    // Rematch — same players/settings, shown only once the game/match is over.
    // The button is a pull-down (mirrors the connection control): clicking it
    // opens a menu of player-order options; picking one starts the rematch.
    const rematchWrap = document.createElement('div');
    rematchWrap.className = 'menu-anchor';

    const rematchBtn = document.createElement('button');
    rematchBtn.className = 'btn btn-primary game-rematch';
    rematchBtn.textContent = 'Rematch ▾';
    rematchBtn.hidden = true;

    const rematchMenu = document.createElement('div');
    rematchMenu.className = 'menu game-rematch-menu';
    rematchMenu.hidden = true;

    // Player count from the latest update(), used to pick the order options.
    let playerCount = 0;

    // Lazy build on open: the menu reflects the current player count.
    const rematchDropdown = attachDropdown(rematchWrap, rematchBtn, rematchMenu, { onOpen: buildRematchMenu });

    // Build the order options for the current player count. Two players can only
    // Keep or Swap; three or more can Rotate or Reverse. Randomize applies to
    // any count.
    function buildRematchMenu() {
        rematchMenu.innerHTML = '';
        // A header so the options read as "player order", not bare verbs.
        const header = document.createElement('div');
        header.className = 'game-rematch-header';
        header.textContent = 'Player order';
        rematchMenu.appendChild(header);
        const ops = playerCount === 2
            ? [['Keep', 'keep'], ['Swap', 'swap'], ['Randomize', 'randomize']]
            : [['Keep', 'keep'], ['Rotate', 'rotate'], ['Reverse', 'reverse'], ['Randomize', 'randomize']];
        for (const [text, op] of ops) {
            const item = document.createElement('button');
            item.type = 'button';
            item.className = 'game-rematch-item';
            item.textContent = text;
            item.addEventListener('click', () => {
                rematchDropdown.close();
                if (onRematch) {
                    onRematch(op);
                }
            });
            rematchMenu.appendChild(item);
        }
    }

    rematchWrap.append(rematchBtn, rematchMenu);

    btnRow.append(nextBtn, undoBtn, endBtn, rematchWrap);
    el.appendChild(btnRow);

    container.appendChild(el);

    let bannerTimeout = null;

    // Win/draw banners persist; transient banners (e.g. BUST) auto-hide.
    function showBanner(text, type) {
        clearTimeout(bannerTimeout);
        banner.textContent = text;
        banner.className = `game-banner game-banner-${type}`;
        banner.hidden = false;
        if (type !== 'win' && type !== 'draw') {
            bannerTimeout = setTimeout(() => {
                banner.hidden = true;
            }, 2000);
        }
    }

    // Set the rules summary line, hiding it when empty.
    function setRules(text) {
        rulesLabel.textContent = text;
        rulesLabel.hidden = !text;
    }

    // Set the round line. During match play the Set/Leg position is shown in
    // front of the game's round text. Every game calls this on each update with
    // the match, so it doubles as the place to note the player count for the
    // Rematch menu (match.numPlayers == state.players.length; works for games
    // like Cricket that build their own scoreboard instead of renderScoreboard).
    function setRound(text, match) {
        if (match) {
            playerCount = match.numPlayers;
        }
        roundLabel.innerHTML = '';
        if (match && isMatchPlay(match)) {
            const label = document.createElement('span');
            label.textContent = `${matchPositionLabel(match)} | ${text}`;
            const histBtn = document.createElement('button');
            histBtn.type = 'button';
            histBtn.className = 'game-round-history';
            histBtn.textContent = 'History';
            histBtn.addEventListener('click', () => openMatchHistory(match));
            roundLabel.append(label, histBtn);
        } else {
            roundLabel.textContent = text;
        }
    }

    function destroy() {
        clearTimeout(bannerTimeout);
        el.remove();
    }

    // Standard tail of every panel's update(): gate the Next button and show
    // the win/draw banner. Panels with extra events (X01's bust) handle those
    // before calling this; per-game button quirks (Killer's assign phase)
    // adjust the buttons after.
    function finishUpdate(state, event) {
        nextBtn.disabled = state.isGameOver;
        if (event === 'win') {
            showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            showBanner(drawMessage, 'draw');
        }
    }

    return { el, rulesLabel, roundLabel, scoreboard, banner, nextBtn, endBtn, rematchBtn, undoBtn, showBanner, setRules, setRound, finishUpdate, destroy };
}

// The standard object a game panel returns to the manager — every panel wraps
// its own update() with the same factory-provided pieces. The buttons are
// exposed as methods rather than raw elements, so the controller/driver layers
// can't depend on panel DOM internals.
export function panelApi(panel, update) {
    return {
        update,
        destroy: panel.destroy,
        showBanner: panel.showBanner,
        // Advance button (Next Player / AI Playing / Next leg →): label + enabled.
        setAdvance(label, enabled) {
            panel.nextBtn.textContent = label;
            panel.nextBtn.disabled = !enabled;
        },
        setUndoEnabled(enabled) {
            panel.undoBtn.disabled = !enabled;
        },
        // Reveal the Rematch button (shown once a game/match is over).
        showRematch() {
            panel.rematchBtn.hidden = false;
        },
    };
}

// A highlighted "Target: 5" / "Aim at: D16" strip above the scoreboard, shared
// by the games that call one target per round. Returns a setter for the value
// text (the label part stays fixed).
export function createTargetStrip(panel, labelText) {
    const strip = document.createElement('div');
    strip.className = 'game-target-strip';
    const label = document.createElement('span');
    label.className = 'game-target-label';
    label.textContent = labelText;
    const value = document.createElement('span');
    value.className = 'game-target-value';
    strip.append(label, value);
    panel.el.insertBefore(strip, panel.scoreboard);
    return {
        el: strip,
        set(text) {
            value.textContent = text;
        },
    };
}

function defaultName(p) {
    return createPlayer(p.uuid).getName();
}

// Render the per-player scoreboard blocks. Options:
//   nameFor(p)   — player label (default: resolved name)
//   valueFor(p)  — right-side value text (score / target / …)
//   infoFor(p)   — optional sub-line under the name (e.g. X01's average)
//   dartsFor(state, p, isCurrent) — darts to show for this player
//   dartMode     — 'hitmiss' (colored per-dart spans) | 'total' (joined + sum)
export function renderScoreboard(scoreboard, state, options = {}) {
    const {
        nameFor = defaultName,
        valueFor,
        infoFor = null,
        dartsFor = (s, p, isCurrent) => (isCurrent ? s.turn.darts : (p.lastDarts || [])),
        dartMode = 'hitmiss',
        match = null,
        checkout = null, // suggested finish for the current player, or null
    } = options;
    const showMatch = match && isMatchPlay(match);
    const ranks = showMatch ? matchRanks(match) : null;

    scoreboard.innerHTML = '';
    for (let i = 0; i < state.players.length; i++) {
        const p = state.players[i];
        const isCurrent = i === state.currentPlayerIndex;

        const block = document.createElement('div');
        block.className = 'game-player-block' + (isCurrent ? ' active' : '');

        const head = document.createElement('div');
        head.className = 'game-player-head';

        const name = document.createElement('span');
        name.className = 'game-player-name';
        // For a team slot, append whoever is up this turn — the turn layer stashes
        // per-team rotation counters on the state as `teamTurns`.
        let label = nameFor(p);
        const members = teamMembersOf(p.uuid);
        if (members && members.length) {
            const turns = (state.teamTurns && state.teamTurns[p.uuid]) || 0;
            label += ` — ${createPlayer(members[turns % members.length]).getName()}`;
        }
        name.textContent = label; // textContent — names are user-entered

        // With a sub-line (e.g. average), name + info stack on the left.
        if (infoFor) {
            const info = document.createElement('div');
            info.className = 'game-player-info';
            const sub = document.createElement('span');
            sub.className = 'game-player-avg';
            sub.textContent = infoFor(p);
            info.append(name, sub);
            head.appendChild(info);
        } else {
            head.appendChild(name);
        }

        const value = document.createElement('span');
        value.className = 'game-player-value';
        value.textContent = valueFor(p, state);
        head.appendChild(value);

        // Per-player legs/sets tally (match play only)
        let matchLine = null;
        if (showMatch) {
            matchLine = document.createElement('div');
            matchLine.className = 'game-player-match';
            const tally = playerMatchLabel(match, p.uuid);
            // When there's a spread, the rank + tally live in one coloured pill
            // (#1 highlighted green); otherwise show the tally plain.
            const rank = ranks ? ranks[match.playerUuids.indexOf(p.uuid)] : null;
            if (rank) {
                const pill = document.createElement('span');
                pill.className = 'game-player-rank' + (rank === 1 ? ' game-player-rank-lead' : '');
                const num = document.createElement('span');
                num.className = 'game-player-rank-num';
                num.textContent = `#${rank}:`;
                pill.append(num, document.createTextNode(tally));
                matchLine.appendChild(pill);
            } else {
                matchLine.textContent = tally;
            }
        }

        // Checkout suggestion for the current player, above the hit history
        let checkoutLine = null;
        if (isCurrent && checkout && checkout.length > 0) {
            checkoutLine = document.createElement('div');
            checkoutLine.className = 'game-player-checkout';
            checkoutLine.textContent = `Checkout: ${checkout.join(', ')}`;
        }

        // Turn darts: live for the current player, last completed for others
        const turn = document.createElement('div');
        turn.className = 'game-player-turn';
        const darts = dartsFor(state, p, isCurrent);
        if (dartMode === 'total') {
            if (darts.length > 0) {
                const total = darts.reduce((sum, d) => sum + d.points, 0);
                turn.textContent = `${darts.map(formatDart).join(', ')}  (${total})`;
            }
        } else {
            for (const d of darts) {
                const span = document.createElement('span');
                span.className = d.hit ? 'game-dart-hit' : 'game-dart-miss';
                span.textContent = formatDart(d);
                if (turn.childNodes.length > 0) {
                    turn.appendChild(document.createTextNode(', '));
                }
                turn.appendChild(span);
            }
        }

        const children = [head];
        if (matchLine) {
            children.push(matchLine);
        }
        if (checkoutLine) {
            children.push(checkoutLine);
        }
        children.push(turn);
        block.append(...children);
        scoreboard.appendChild(block);
    }

    centerActiveRow(scoreboard, state.currentPlayerIndex);
}

// Centre the active player's row in a scrollable list, but only when the
// active player changes (re-centering on every dart would jitter). Also used
// by panels that build their own scoreboard (Cricket's marks table).
export function centerActiveRow(container, currentPlayerIndex, selector = '.game-player-block.active') {
    const activeKey = String(currentPlayerIndex);
    if (container.dataset.activeKey !== activeKey) {
        container.dataset.activeKey = activeKey;
        const activeRow = container.querySelector(selector);
        if (activeRow) {
            activeRow.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
}

// Common winner-name lookup for "X wins!" banners.
export function winnerName(state) {
    return createPlayer(state.players[state.winner].uuid).getName();
}
