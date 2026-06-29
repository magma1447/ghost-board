// Cat and Mouse game panel

import '../game-panel.css';
import { formatDart, formatRoundLabel } from '../format.js';
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

    // Chase summary (single line — the gap is the same for both players)
    const gapLine = document.createElement('div');
    gapLine.className = 'game-summary';
    el.appendChild(gapLine);

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
            // Show the human name with the fixed role, e.g. "Luke the Nuke (Cat)"
            const playerName = createPlayer(p.uuid).getName();
            name.textContent = p.role ? `${playerName} (${p.role})` : playerName;

            const target = document.createElement('span');
            target.className = 'game-player-value';
            target.textContent = '\u2192 ' + p.currentTarget;

            head.append(name, target);

            // Turn darts: live for the current player (turnDisplay accumulates
            // across sprint sets), last completed turn for others
            const turn = document.createElement('div');
            turn.className = 'game-player-turn';
            const darts = isCurrent ? state.turnDisplay : (p.lastDarts || []);
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

        // Chase gap, from the mouse's perspective (it starts ahead and the
        // cat catches when this reaches 0). = gap + mouse.progress - cat.progress.
        const ahead = state.gap + state.players[0].progress - state.players[1].progress;
        gapLine.textContent = `Mouse is ${ahead} ahead`;
        gapLine.hidden = state.gameOver;

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
