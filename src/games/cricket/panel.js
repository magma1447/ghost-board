// Cricket game panel — a compact table: one row per player, a column per
// number (20…15 + bull), plus name and score. Hit history is omitted for now
// (to be figured out separately).

import './panel.css';
import { settingsLine } from '../format.js';
import { createGamePanel, winnerName } from '../panel-factory.js';
import { createPlayer } from '../../state/players.js';
import { isMatchPlay, playerMatchLabel } from '../match.js';
import { defaults, fields } from './options.js';

// Mark state → glyph, mirroring pen-and-paper Cricket: a slash, then a cross,
// then a circle (round the cross) once the number is closed.
function markGlyph(m) {
    return m >= 3 ? '○' : m === 2 ? '✕' : m === 1 ? '/' : '';
}

export function createCricketPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

    function renderBoard(state, match) {
        const board = panel.scoreboard;
        const showMatch = match && isMatchPlay(match);
        const showScore = state.options.variant !== 'simple'; // Simple has no points
        board.innerHTML = '';

        const table = document.createElement('table');
        table.className = 'game-cricket-table';

        // Header row: name corner | 20 … 15 Bull | score corner
        const thead = document.createElement('thead');
        const hrow = document.createElement('tr');
        hrow.appendChild(document.createElement('th'));
        for (const n of state.numbers) {
            const th = document.createElement('th');
            th.textContent = n === 'bull' ? 'Bull' : String(n);
            hrow.appendChild(th);
        }
        if (showScore) {
            hrow.appendChild(document.createElement('th'));
        }
        thead.appendChild(hrow);
        table.appendChild(thead);

        const tbody = document.createElement('tbody');
        for (let i = 0; i < state.players.length; i++) {
            const p = state.players[i];
            const row = document.createElement('tr');
            if (i === state.currentPlayerIndex) {
                row.className = 'active';
            }

            const nameCell = document.createElement('td');
            nameCell.className = 'game-cricket-name';
            const nameText = document.createElement('span');
            nameText.textContent = createPlayer(p.uuid).getName();
            nameCell.appendChild(nameText);
            if (showMatch) {
                const tally = document.createElement('span');
                tally.className = 'game-cricket-tally';
                tally.textContent = playerMatchLabel(match, p.uuid);
                nameCell.appendChild(tally);
            }
            row.appendChild(nameCell);

            for (const n of state.numbers) {
                const td = document.createElement('td');
                td.className = 'game-cricket-cell' + (p.marks[n] >= 3 ? ' closed' : '');
                td.textContent = markGlyph(p.marks[n]);
                row.appendChild(td);
            }

            if (showScore) {
                const scoreCell = document.createElement('td');
                scoreCell.className = 'game-cricket-score';
                scoreCell.textContent = String(p.score);
                row.appendChild(scoreCell);
            }

            tbody.appendChild(row);
        }
        table.appendChild(tbody);
        board.appendChild(table);

        // Centre the active row when the active player changes
        const activeKey = String(state.currentPlayerIndex);
        if (board.dataset.activeKey !== activeKey) {
            board.dataset.activeKey = activeKey;
            const active = board.querySelector('tr.active');
            if (active) {
                active.scrollIntoView({ block: 'center', behavior: 'smooth' });
            }
        }
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(`Round ${state.round}`, match);
        renderBoard(state, match);
        panel.nextBtn.disabled = state.isGameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, undoBtn: panel.undoBtn, showBanner: panel.showBanner };
}
