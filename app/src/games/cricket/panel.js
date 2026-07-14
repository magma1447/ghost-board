// Cricket game panel — a compact table: one row per player, a column per
// number (20…15 + bull), plus name and score. The turn's darts show under the
// name.

import './panel.css';
import { formatDart, settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, panelApi, centerActiveRow } from '../../game-engine/core/panel-factory.js';
import { markGlyph } from '../../game-engine/shared/cricket-marks.js';
import { createPlayer } from '../../state/players.js';
import { isMatchPlay, playerMatchLabel } from '../../game-engine/core/match.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createCricketPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Cricket', rulesMd });

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
            const isCurrent = i === state.currentPlayerIndex;
            const row = document.createElement('tr');
            if (isCurrent) {
                row.className = 'active';
            }

            const nameCell = document.createElement('td');
            nameCell.className = 'game-cricket-name';
            const nameText = document.createElement('span');
            nameText.textContent = createPlayer(p.uuid).getName();
            nameCell.appendChild(nameText);

            // The turn's darts under the name — live for the current player,
            // last completed turn for the others. When present, the name cell
            // stacks to the top so the darts sit below; other columns stay
            // middle-aligned.
            const darts = isCurrent ? state.turn.darts : (p.lastDarts || []);
            if (darts.length > 0) {
                const history = document.createElement('span');
                history.className = 'game-cricket-history';
                history.textContent = darts.map(formatDart).join(', ');
                nameCell.appendChild(history);
                nameCell.classList.add('stacked');
            }

            if (showMatch) {
                const tally = document.createElement('span');
                tally.className = 'game-cricket-tally';
                tally.textContent = playerMatchLabel(match, p.uuid);
                nameCell.appendChild(tally);
                nameCell.classList.add('stacked');
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

        centerActiveRow(board, state.currentPlayerIndex, 'tr.active');
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(`Round ${state.round}`, match);
        renderBoard(state, match);
        panel.finishUpdate(state, event);
    }

    return panelApi(panel, update);
}
