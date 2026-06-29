// X01 game panel — renders x01 game state

import { formatRoundLabel, settingsLine } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { defaults, fields } from './options.js';

export function createX01Panel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(formatRoundLabel(state.round, state.options.maxRounds), match);

        renderScoreboard(panel.scoreboard, state, {
            infoFor: (p) => (p.visits > 0 ? `Avg ${(p.scored / p.visits).toFixed(2)}` : 'Avg —'),
            valueFor: (p) => String(p.score),
            dartMode: 'total',
            match,
        });

        panel.nextBtn.disabled = state.isGameOver;

        if (event === 'bust') {
            panel.showBanner('BUST!', 'bust');
        } else if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — round limit reached', 'draw');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, undoBtn: panel.undoBtn, showBanner: panel.showBanner };
}
