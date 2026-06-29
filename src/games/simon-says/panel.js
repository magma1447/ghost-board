// Simon Says game panel — shows targets, scores, and hit/miss feedback

import '../game-panel.css';
import { formatDart } from '../format.js';
import { createPlayer } from '../../state/players.js';

export function createSimonSaysPanel(container, { onNextPlayer, onEndGame }) {
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

    // Target display: "Simon says: 5, 17, 3"
    const sequenceLabel = document.createElement('div');
    sequenceLabel.className = 'game-sequence';
    el.appendChild(sequenceLabel);

    // Scoreboard
    const scoreboard = document.createElement('div');
    scoreboard.className = 'game-scoreboard';
    el.appendChild(scoreboard);

    // Turn info (darts thrown)
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

    function showBanner(text, type) {
        banner.textContent = text;
        banner.className = `game-banner game-banner-${type}`;
        banner.hidden = false;
    }

    function buildRulesText(state) {
        const tags = [];
        if (state.hitMode !== 'any') {
            tags.push(state.hitMode === 'doubles' ? 'Doubles' : 'Triples');
        }
        if (state.scoring === 'staggered') {
            tags.push('1-2-3');
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
        const roundText = state.maxRounds > 0
            ? `Round ${state.round} / ${state.maxRounds}`
            : `Round ${state.round}`;
        roundLabel.textContent = roundText;

        // Target display — green when hit, orange when still needed
        sequenceLabel.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'game-sequence-label';
        label.textContent = 'Simon says: ';
        sequenceLabel.appendChild(label);

        for (let i = 0; i < state.sequence.length; i++) {
            if (i > 0) {
                sequenceLabel.appendChild(document.createTextNode(', '));
            }
            const span = document.createElement('span');
            span.textContent = String(state.sequence[i]);
            if (state.targetsHit[i]) {
                span.className = 'game-dart-hit';
            } else {
                span.className = 'game-sequence-current';
            }
            sequenceLabel.appendChild(span);
        }

        // Scoreboard
        scoreboard.innerHTML = '';
        for (let i = 0; i < state.players.length; i++) {
            const p = state.players[i];
            const row = document.createElement('div');
            row.className = 'game-score-row' + (i === state.currentPlayerIndex ? ' active' : '');

            const name = document.createElement('span');
            name.className = 'game-player-name';
            name.textContent = createPlayer(p.uuid).getName();

            const score = document.createElement('span');
            score.className = 'game-player-value';
            score.textContent = String(p.score);

            row.append(name, score);
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
            showBanner(`${createPlayer(state.players[state.winner].uuid).getName()} wins!`, 'win');
        } else if (event === 'draw') {
            showBanner('Draw \u2014 tied scores', 'draw');
        }
    }

    function destroy() {
        el.remove();
    }

    return { update, destroy };
}
