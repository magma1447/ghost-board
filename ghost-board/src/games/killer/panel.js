// Killer game panel — two phases. During "assign" it shows a strip and a list
// of players with their claimed number (the current thrower highlighted), and
// hides the scoreboard and Next button. During "play" it's the shared
// scoreboard: each player's lives, their number / Killer / Out status, with out
// players dimmed.

import './panel.css';
import { settingsLine } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { createPlayer } from '../../state/players.js';
import { icons } from '../../ui/common/icons.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createKillerPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Killer', rulesMd });

    // Assign-phase UI sits above the scoreboard and is hidden during play.
    const assignBox = document.createElement('div');
    assignBox.className = 'game-killer-assign';
    panel.el.insertBefore(assignBox, panel.scoreboard);

    // Scope for the hearts styling on the play scoreboard.
    panel.scoreboard.classList.add('game-killer-scoreboard');

    function renderAssign(state) {
        assignBox.innerHTML = '';

        const strip = document.createElement('div');
        strip.className = 'game-killer-assign-strip';
        strip.textContent = 'Throwing for numbers — hit a free number';
        assignBox.appendChild(strip);

        const list = document.createElement('div');
        list.className = 'game-killer-assign-list';
        for (let i = 0; i < state.players.length; i++) {
            const p = state.players[i];
            const row = document.createElement('div');
            row.className = 'game-killer-assign-row' + (i === state.assignIndex ? ' active' : '');
            const name = document.createElement('span');
            name.className = 'game-killer-assign-name';
            name.textContent = createPlayer(p.uuid).getName(); // textContent — user-entered
            const num = document.createElement('span');
            num.className = 'game-killer-assign-num';
            num.textContent = p.number !== null ? `#${p.number}` : '—';
            row.append(name, num);
            list.appendChild(row);
        }
        assignBox.appendChild(list);
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));

        if (state.phase === 'assign') {
            panel.setRound('Assign numbers', match);
            assignBox.hidden = false;
            renderAssign(state);
            panel.scoreboard.hidden = true;
        } else {
            assignBox.hidden = true;
            panel.scoreboard.hidden = false;
            panel.setRound(`Round ${state.round}`, match);

            renderScoreboard(panel.scoreboard, state, {
                valueFor: () => '', // hearts rendered as equal-size pips below
                infoFor: (p) => {
                    const label = `Number: ${p.number}`;
                    if (p.out) {
                        return `Out · ${label}`;
                    }
                    return `${p.killer ? 'Killer' : 'Not armed'} · ${label}`;
                },
                dartMode: 'total',
                match,
            });

            // Fill each card with heart pips — one per configured life, filled to
            // the player's current lives (same glyph throughout, so equal size;
            // filled vs empty is colour only) — and dim eliminated players.
            // renderScoreboard emits one block per player in order, so index-match.
            const blocks = panel.scoreboard.querySelectorAll('.game-player-block');
            state.players.forEach((p, i) => {
                const block = blocks[i];
                if (!block) {
                    return;
                }
                if (p.out) {
                    block.classList.add('game-killer-out');
                }
                const valueEl = block.querySelector('.game-player-value');
                if (valueEl) {
                    valueEl.textContent = '';
                    for (let h = 0; h < state.cap; h++) {
                        const pip = document.createElement('span');
                        pip.className = 'game-killer-heart' + (h < p.lives ? ' filled' : '');
                        pip.innerHTML = icons.heart; // Lucide heart (stroke=currentColor)
                        valueEl.appendChild(pip);
                    }
                }
            });
        }

        panel.nextBtn.hidden = state.phase === 'assign';
        panel.nextBtn.disabled = state.phase === 'assign' || state.isGameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — no one left standing', 'draw');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, undoBtn: panel.undoBtn, showBanner: panel.showBanner };
}
