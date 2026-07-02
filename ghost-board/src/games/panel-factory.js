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
import { formatDart } from './format.js';
import { createPlayer } from '../state/players.js';
import { isMatchPlay, matchPositionLabel, playerMatchLabel, matchRanks } from './match.js';
import { openMatchHistory } from '../ui/match-history.js';

export function createGamePanel(container, { onNextPlayer, onEndGame, onRematch, onUndo }) {
    const el = document.createElement('div');
    el.className = 'game-panel';

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

    // Rematch — same players/settings, shown only once the game/match is over
    const rematchBtn = document.createElement('button');
    rematchBtn.className = 'btn btn-primary game-rematch';
    rematchBtn.textContent = 'Rematch';
    rematchBtn.hidden = true;
    rematchBtn.addEventListener('click', () => onRematch && onRematch());

    btnRow.append(nextBtn, undoBtn, endBtn, rematchBtn);
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
    // front of the game's round text.
    function setRound(text, match) {
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

    return { el, rulesLabel, roundLabel, scoreboard, banner, nextBtn, endBtn, rematchBtn, undoBtn, showBanner, setRules, setRound, destroy };
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
        name.textContent = nameFor(p); // textContent — names are user-entered

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

    // Centre the active player's card in the scrollable scoreboard, but only
    // when the active player changes (re-centering on every dart would jitter).
    const activeKey = String(state.currentPlayerIndex);
    if (scoreboard.dataset.activeKey !== activeKey) {
        scoreboard.dataset.activeKey = activeKey;
        const activeBlock = scoreboard.querySelector('.game-player-block.active');
        if (activeBlock) {
            activeBlock.scrollIntoView({ block: 'center', behavior: 'smooth' });
        }
    }
}

// Common winner-name lookup for "X wins!" banners.
export function winnerName(state) {
    return createPlayer(state.players[state.winner].uuid).getName();
}
