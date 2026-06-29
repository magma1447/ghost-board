// Simon Says game panel — shows targets, scores, and hit/miss feedback

import '../game-panel.css';
import { formatDart, formatRoundLabel } from '../format.js';
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
        // Past the round limit but still playing → sudden death (play-until-winner)
        roundLabel.textContent = (!state.gameOver && state.maxRounds > 0 && state.round > state.maxRounds)
            ? `Sudden death · round ${state.round}`
            : formatRoundLabel(state.round, state.maxRounds);

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

        // Scoreboard — one block per player, with their turn darts below
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

            const score = document.createElement('span');
            score.className = 'game-player-value';
            score.textContent = String(p.score);

            head.append(name, score);

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
            showBanner('Draw \u2014 tied scores', 'draw');
        }
    }

    function destroy() {
        el.remove();
    }

    return { update, destroy };
}
