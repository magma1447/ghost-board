// Cat and Mouse game panel

import { formatRoundLabel } from '../format.js';
import { createPlayer } from '../../state/players.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';

export function createCatAndMousePanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

    // Chase summary (single line — the gap is the same for both players),
    // shown between the scoreboard and the banner.
    const gapLine = document.createElement('div');
    gapLine.className = 'game-summary';
    panel.el.insertBefore(gapLine, panel.banner);

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
        return tags.join(' · ');
    }

    function update(state, event) {
        panel.setRules(buildRulesText(state));
        panel.roundLabel.textContent = formatRoundLabel(state.round, state.maxRounds);

        renderScoreboard(panel.scoreboard, state, {
            // Show the human name with the fixed role, e.g. "Luke the Nuke (Cat)"
            nameFor: (p) => {
                const playerName = createPlayer(p.uuid).getName();
                return p.role ? `${playerName} (${p.role})` : playerName;
            },
            valueFor: (p) => '→ ' + p.currentTarget,
            // turnDisplay accumulates across sprint sets
            dartsFor: (s, p, isCurrent) => (isCurrent ? s.turnDisplay : (p.lastDarts || [])),
        });

        // Chase gap, from the mouse's perspective (it starts ahead and the
        // cat catches when this reaches 0). = gap + mouse.progress - cat.progress.
        const ahead = state.gap + state.players[0].progress - state.players[1].progress;
        gapLine.textContent = `Mouse is ${ahead} ahead`;
        gapLine.hidden = state.gameOver;

        panel.nextBtn.disabled = state.gameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — round limit reached', 'draw');
        }
    }

    return { update, destroy: panel.destroy };
}
