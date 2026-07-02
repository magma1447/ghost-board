// Score Rush game panel — running totals racing to a target score.

import { formatRoundLabel, settingsLine, averageLabel } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { defaults, fields } from './options.js';

export function createScoreRushPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        // No round limit — show the target alongside the current round number
        panel.setRound(`First to ${state.options.targetScore} · ${formatRoundLabel(state.round, null)}`, match);

        renderScoreboard(panel.scoreboard, state, {
            infoFor: averageLabel,
            valueFor: (p) => String(p.score),
            dartMode: 'total', // show the turn's darts joined with their sum
            match,
        });

        panel.nextBtn.disabled = state.isGameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, undoBtn: panel.undoBtn, showBanner: panel.showBanner };
}
