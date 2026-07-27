// Domination panel — two phases. During "assign" it shows a strip and a list of
// players with the number they've claimed (current thrower highlighted), and
// hides the scoreboard and Next button. During "play" it's the shared scoreboard:
// each player's colour, zones held and board share, with out players dimmed. The
// board itself is the map (coloured by the LED layer); the panel is the tally.

import './panel.css';
import { settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, panelApi } from '../../game-engine/core/panel-factory.js';
import { createPlayer } from '../../state/players.js';
import { defaults, fields } from './options.js';
import { playerColor } from './colors.js';
import rulesMd from './rules.md?raw';

export function createDominationPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Domination', rulesMd, drawMessage: 'Draw — no clear winner' });

    // Assign-phase UI sits above the scoreboard and is hidden during play.
    const assignBox = document.createElement('div');
    assignBox.className = 'game-domination-assign';
    panel.el.insertBefore(assignBox, panel.scoreboard);

    // A small square in a player's territory colour.
    function swatch(i) {
        const el = document.createElement('span');
        el.className = 'game-domination-swatch';
        el.style.background = playerColor(i);
        return el;
    }

    function renderAssign(state) {
        assignBox.innerHTML = '';

        const strip = document.createElement('div');
        strip.className = 'game-domination-assign-strip';
        strip.textContent = 'Claiming numbers — hit a free number';
        assignBox.appendChild(strip);

        const list = document.createElement('div');
        list.className = 'game-domination-assign-list';
        for (let i = 0; i < state.players.length; i++) {
            const p = state.players[i];
            const row = document.createElement('div');
            row.className = 'game-domination-assign-row' + (i === state.assignIndex ? ' active' : '');
            const name = document.createElement('span');
            name.className = 'game-domination-assign-name';
            name.append(swatch(i), document.createTextNode(createPlayer(p.uuid).getName())); // textContent — user-entered
            const num = document.createElement('span');
            num.className = 'game-domination-assign-num';
            num.textContent = p.home !== null ? `#${p.home}` : '—';
            row.append(name, num);
            list.appendChild(row);
        }
        assignBox.appendChild(list);
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));

        if (state.phase === 'assign') {
            panel.setRound('Claim numbers', match);
            assignBox.hidden = false;
            renderAssign(state);
            panel.scoreboard.hidden = true;
        } else {
            assignBox.hidden = true;
            panel.scoreboard.hidden = false;
            panel.setRound(`Round ${state.round}`, match);

            renderScoreboard(panel.scoreboard, state, {
                valueFor: (p) => String(p.tiles),
                infoFor: (p) => (p.out ? 'Out' : `${Math.round((p.tiles / state.totalCells) * 100)}% of the board`),
                dartMode: 'hitmiss',
                match,
            });

            // Prefix each card's name with the player's colour swatch, and dim
            // eliminated players. renderScoreboard emits one block per player in
            // order, so index-match.
            const blocks = panel.scoreboard.querySelectorAll('.game-player-block');
            state.players.forEach((p, i) => {
                const block = blocks[i];
                if (!block) {
                    return;
                }
                if (p.out) {
                    block.classList.add('game-domination-out');
                }
                const nameEl = block.querySelector('.game-player-name');
                if (nameEl && !nameEl.querySelector('.game-domination-swatch')) {
                    nameEl.prepend(swatch(i));
                }
            });
        }

        panel.finishUpdate(state, event);

        // The Next button stays out of play until numbers are claimed.
        panel.nextBtn.hidden = state.phase === 'assign';
        if (state.phase === 'assign') {
            panel.nextBtn.disabled = true;
        }
    }

    return panelApi(panel, update);
}
