// Around the Clock game panel

import '../game-panel.css';
import { formatDart, formatRoundLabel } from '../format.js';
import { createPlayer } from '../../state/players.js';

export function createAroundTheClockPanel(container, { onNextPlayer, onEndGame }) {
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

    // Event banner (win / draw)
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

    const endBtn = document.createElement('button');
    endBtn.className = 'btn btn-danger';
    endBtn.textContent = 'End Game';
    endBtn.addEventListener('click', onEndGame);

    btnRow.append(nextBtn, endBtn);
    el.appendChild(btnRow);

    container.appendChild(el);

    function formatTarget(target, state) {
        if (target > state.finalTarget) {
            return 'Done';
        }
        if (target === 21) {
            return 'Bull';
        }
        return String(target);
    }

    function showBanner(text, type) {
        banner.textContent = text;
        banner.className = `game-banner game-banner-${type}`;
        banner.hidden = false;
    }

    function buildRulesText(state) {
        const tags = [];
        if (state.bullFinish !== 'off') {
            tags.push(state.bullFinish === 'double' ? 'D-Bull finish' : 'Bull finish');
        }
        if (state.hitMode !== 'any') {
            tags.push(state.hitMode === 'doubles' ? 'Doubles' : 'Triples');
        }
        if (state.multiStep) {
            tags.push('Multi-step');
        }
        if (state.maxRounds > 0) {
            tags.push(`${state.maxRounds} rnd`);
        }
        return tags.length > 0 ? tags.join(' \u00b7 ') : '';
    }

    function update(state, event) {
    // Rules
        const rulesText = buildRulesText(state);
        rulesLabel.textContent = rulesText;
        rulesLabel.hidden = !rulesText;

        // Round
        roundLabel.textContent = formatRoundLabel(state.round, state.maxRounds);

        // Scoreboard \u2014 one block per player, with their turn darts below
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
            name.textContent = createPlayer(p.uuid).getName();

            const target = document.createElement('span');
            target.className = 'game-player-value';
            target.textContent = '\u2192 ' + formatTarget(p.currentTarget, state);

            head.append(name, target);

            // Turn darts: live for the current player, last completed for others
            const turn = document.createElement('div');
            turn.className = 'game-player-turn';
            const darts = isCurrent ? state.turnDarts : (p.lastDarts || []);
            for (const d of darts) {
                const span = document.createElement('span');
                span.className = d.hit ? 'game-dart-hit' : 'game-dart-miss';
                span.textContent = formatDart(d);
                if (turn.childNodes.length > 0) {
                    turn.appendChild(document.createTextNode(', '));
                }
                turn.appendChild(span);
            }

            block.append(head, turn);
            scoreboard.appendChild(block);
        }

        nextBtn.disabled = state.gameOver;

        if (event === 'win') {
            showBanner(`${createPlayer(state.players[state.winner].uuid).getName()} wins!`, 'win');
        } else if (event === 'draw') {
            showBanner('Draw \u2014 round limit reached', 'draw');
        }
    }

    function destroy() {
        el.remove();
    }

    return { update, destroy };
}
