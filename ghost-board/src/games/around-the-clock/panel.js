// Around the Clock game panel

import { formatRoundLabel, settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createAroundTheClockPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Around the Clock', rulesMd });

    function formatTarget(target, state) {
        if (target > state.finalTarget) {
            return 'Done';
        }
        if (target === 21) {
            return 'Bull';
        }
        return String(target);
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(formatRoundLabel(state.round, state.options.maxRounds), match);

        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => '→ ' + formatTarget(p.currentTarget, state),
            match,
        });

        panel.nextBtn.disabled = state.isGameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — round limit reached', 'draw');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, undoBtn: panel.undoBtn, showBanner: panel.showBanner };
}
