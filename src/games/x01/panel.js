// X01 game panel — renders x01 game state

import '../game-panel.css';
import { formatDart } from '../format.js';
import { createPlayer } from '../../state/players.js';

export function createX01Panel(container, { onNextPlayer, onEndGame }) {
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

    const endBtn = document.createElement('button');
    endBtn.className = 'btn btn-danger';
    endBtn.textContent = 'End Game';
    endBtn.addEventListener('click', onEndGame);

    btnRow.append(nextBtn, endBtn);
    el.appendChild(btnRow);

    container.appendChild(el);

    let bannerTimeout = null;

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

    function buildRulesText(state) {
        const tags = [];
        if (state.doubleIn) {
            tags.push('DI');
        }
        if (state.doubleOut) {
            tags.push('DO');
        }
        if (state.bullMode === '50/50') {
            tags.push('Bull 50/50');
        }
        if (state.maxRounds > 0) {
            tags.push(`${state.maxRounds} rnd`);
        }
        return tags.length > 0 ? tags.join(' · ') : '';
    }

    function update(state, event) {
    // Rules (shown once, static)
        const rulesText = buildRulesText(state);
        rulesLabel.textContent = rulesText;
        rulesLabel.hidden = !rulesText;

        // Round
        const roundText = state.maxRounds > 0
            ? `Round ${state.round} / ${state.maxRounds}`
            : `Round ${state.round}`;
        roundLabel.textContent = roundText;

        scoreboard.innerHTML = '';
        for (let i = 0; i < state.players.length; i++) {
            const p = state.players[i];
            const row = document.createElement('div');
            row.className = 'game-score-row' + (i === state.currentPlayerIndex ? ' active' : '');

            // Use textContent (not innerHTML) — names are user-entered
            const name = document.createElement('span');
            name.className = 'game-player-name';
            name.textContent = createPlayer(p.uuid).getName();

            const value = document.createElement('span');
            value.className = 'game-player-value';
            value.textContent = p.score;

            row.append(name, value);
            scoreboard.appendChild(row);
        }

        if (state.turnDarts.length > 0) {
            const dartStrs = state.turnDarts.map(formatDart);
            const turnTotal = state.turnDarts.reduce((sum, d) => sum + d.points, 0);
            turnInfo.textContent = `${dartStrs.join(', ')}  (${turnTotal})`;
        } else {
            turnInfo.textContent = '';
        }

        nextBtn.disabled = state.gameOver;

        if (event === 'bust') {
            showBanner('BUST!', 'bust');
        } else if (event === 'win') {
            showBanner(`${createPlayer(state.players[state.winner].uuid).getName()} wins!`, 'win');
        } else if (event === 'draw') {
            showBanner('Draw — round limit reached', 'draw');
        }
    }

    function destroy() {
        clearTimeout(bannerTimeout);
        el.remove();
    }

    return { update, destroy };
}
