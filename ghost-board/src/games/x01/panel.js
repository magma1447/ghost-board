// X01 game panel — renders x01 game state

import { formatRoundLabel, settingsLine, averageLabel } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { defaults, fields } from './options.js';
import { checkoutFor } from './checkout-sequence.js';
import rulesMd from './rules.md?raw';

export function createX01Panel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'X01', rulesMd });

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(formatRoundLabel(state.round, state.options.maxRounds), match);

        renderScoreboard(panel.scoreboard, state, {
            infoFor: averageLabel,
            valueFor: (p) => String(p.score),
            dartMode: 'total',
            match,
            checkout: checkoutFor(state),
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
