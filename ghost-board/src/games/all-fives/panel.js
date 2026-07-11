// All Fives game panel — score (fives), points-to-go, and each turn's darts
// with its raw total (so you can see whether it landed on a five).

import { formatRoundLabel, settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createAllFivesPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'All Fives', rulesMd });

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(formatRoundLabel(state.round, null), match);

        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => String(p.score),
            infoFor: (p) => `${Math.max(0, state.options.target - p.score)} to go`,
            dartMode: 'total', // show the turn's darts joined with their raw sum
            match,
        });

        panel.nextBtn.disabled = state.isGameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, undoBtn: panel.undoBtn, showBanner: panel.showBanner };
}
