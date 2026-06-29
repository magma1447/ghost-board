// Cat and Mouse game panel

import '../game-panel.css';
import { formatDart } from '../format.js';
import { createPlayer } from '../../state/players.js';

export function createCatAndMousePanel(container, { onNextPlayer, onEndGame }) {
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

    // Turn info
    const turnInfo = document.createElement('div');
    turnInfo.className = 'game-turn-info';
    el.appendChild(turnInfo);

    // Event banner (win / draw)
    const banner = document.createElement('div');
    banner.className = 'game-banner';
    banner.hidden = true;
    el.appendChild(banner);

    // Buttons
    const btnRow = document.createElement('div');
    btnRow.className = 'game-buttons';

    const nextBtn = document.createElement('button');
    nextBtn.className = 'game-btn';
    nextBtn.textContent = 'Next Player';
    nextBtn.addEventListener('click', onNextPlayer);

    const endBtn = document.createElement('button');
    endBtn.className = 'game-btn game-btn-end';
    endBtn.textContent = 'End Game';
    endBtn.addEventListener('click', onEndGame);

    btnRow.append(nextBtn, endBtn);
    el.appendChild(btnRow);

    container.appendChild(el);

    function showBanner(text, type) {
        banner.textContent = text;
        banner.className = `game-banner game-banner-${type}`;
        banner.hidden = false;
    }

    function buildRulesText(state) {
        const tags = [];
        tags.push(`Gap ${state.gap}`);
        if (state.hitMode !== 'any') {
            tags.push(state.hitMode === 'doubles' ? 'Doubles' : 'Triples');
        }
        if (state.multiStep) {
            tags.push('Multi-step');
        }
        if (state.maxRounds > 0) {
            tags.push(`${state.maxRounds} rnd`);
        }
        return tags.join(' \u00b7 ');
    }

    function update(state, event) {
    // Rules
        rulesLabel.textContent = buildRulesText(state);
        rulesLabel.hidden = false;

        // Round
        const roundText = state.maxRounds > 0
            ? `Round ${state.round} / ${state.maxRounds}`
            : `Round ${state.round}`;
        roundLabel.textContent = roundText;

        // Scoreboard
        scoreboard.innerHTML = '';
        for (let i = 0; i < state.players.length; i++) {
            const p = state.players[i];
            const row = document.createElement('div');
            row.className = 'game-score-row' + (i === state.currentPlayerIndex ? ' active' : '');

            const name = document.createElement('span');
            name.className = 'game-player-name';
            // Show the human name with the fixed role, e.g. "Luke the Nuke (Cat)"
            const playerName = createPlayer(p.uuid).getName();
            name.textContent = p.role ? `${playerName} (${p.role})` : playerName;

            const target = document.createElement('span');
            target.className = 'game-player-value';
            target.textContent = '\u2192 ' + p.currentTarget;

            row.append(name, target);
            scoreboard.appendChild(row);
        }

        // Turn darts
        if (state.turnDarts.length > 0) {
            turnInfo.innerHTML = '';
            for (const d of state.turnDarts) {
                const span = document.createElement('span');
                span.className = d.hit ? 'game-dart-hit' : 'game-dart-miss';
                span.textContent = formatDart(d);
                if (turnInfo.childNodes.length > 0) {
                    turnInfo.appendChild(document.createTextNode(', '));
                }
                turnInfo.appendChild(span);
            }
        } else {
            turnInfo.textContent = '';
        }

        nextBtn.disabled = state.gameOver;

        if (event === 'win') {
            const winner = state.players[state.winner];
            showBanner(`${createPlayer(winner.uuid).getName()} wins!`, 'win');
        } else if (event === 'draw') {
            showBanner('Draw \u2014 round limit reached', 'draw');
        }
    }

    function destroy() {
        el.remove();
    }

    return { update, destroy };
}
