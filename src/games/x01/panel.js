// X01 game panel — renders x01 game state

import { formatRoundLabel } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';

export function createX01Panel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

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
        panel.setRules(buildRulesText(state));
        panel.roundLabel.textContent = formatRoundLabel(state.round, state.maxRounds);

        renderScoreboard(panel.scoreboard, state, {
            infoFor: (p) => (p.visits > 0 ? `Avg ${(p.scored / p.visits).toFixed(2)}` : 'Avg —'),
            valueFor: (p) => String(p.score),
            dartMode: 'total',
        });

        panel.nextBtn.disabled = state.gameOver;

        if (event === 'bust') {
            panel.showBanner('BUST!', 'bust');
        } else if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — round limit reached', 'draw');
        }
    }

    return { update, destroy: panel.destroy };
}
