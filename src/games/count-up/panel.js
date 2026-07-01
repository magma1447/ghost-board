// Count Up game panel — running totals and each turn's darts with its sum.

import { formatRoundLabel, settingsLine, averageLabel } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { defaults, fields } from './options.js';

export function createCountUpPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));

        // Past the round limit but still playing → sudden death (play-until-winner)
        const roundText = (!state.isGameOver && state.options.maxRounds !== null && state.round > state.options.maxRounds)
            ? `Sudden death · round ${state.round}`
            : formatRoundLabel(state.round, state.options.maxRounds);
        panel.setRound(roundText, match);

        renderScoreboard(panel.scoreboard, state, {
            infoFor: averageLabel,
            valueFor: (p) => String(p.score),
            dartMode: 'total', // show the turn's darts joined with their sum
            match,
        });

        panel.nextBtn.disabled = state.isGameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — tied scores', 'draw');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, undoBtn: panel.undoBtn, showBanner: panel.showBanner };
}
