// Scram game panel — a close-out strip (this half's marks for every number)
// above the shared scoreboard. Each player's card shows their running total and
// their role this half (Stopper / Scorer).

import './panel.css';
import { settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

// Mark state → glyph, mirroring pen-and-paper Cricket: a slash, then a cross,
// then a circle (round the cross) once the number is closed.
function markGlyph(m) {
    return m >= 3 ? '○' : m === 2 ? '✕' : m === 1 ? '/' : '';
}

export function createScramPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Scram', rulesMd });

    const closeStrip = document.createElement('div');
    closeStrip.className = 'game-scram-close';
    panel.el.insertBefore(closeStrip, panel.scoreboard);

    function renderCloseStrip(state) {
        closeStrip.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'game-scram-close-label';
        label.textContent = 'Numbers:';
        closeStrip.appendChild(label);

        for (const n of state.numbers) {
            const cell = document.createElement('span');
            const closed = state.marks[n] >= 3;
            cell.className = 'game-scram-close-cell' + (closed ? ' closed' : '');
            const num = document.createElement('span');
            num.className = 'game-scram-close-num';
            num.textContent = n === 'bull' ? 'Bull' : String(n);
            const glyph = document.createElement('span');
            glyph.className = 'game-scram-close-glyph';
            glyph.textContent = markGlyph(state.marks[n]);
            cell.append(num, glyph);
            closeStrip.appendChild(cell);
        }
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));

        const roundText = state.phase > 2
            ? `Sudden death · half ${state.phase}`
            : `Half ${state.phase} of 2`;
        panel.setRound(roundText, match);

        renderCloseStrip(state);

        // infoFor receives only the player object, so identify the stopper by
        // object identity against state.players[stopperIndex].
        const stopper = state.players[state.stopperIndex];
        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => String(p.score),
            infoFor: (p) => (p === stopper ? 'Stopper' : 'Scorer'),
            dartMode: 'total',
            match,
        });

        panel.nextBtn.disabled = state.isGameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — tied scores', 'draw');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, undoBtn: panel.undoBtn, showBanner: panel.showBanner };
}
