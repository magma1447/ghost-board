// Around the Clock game panel

import { formatRoundLabel, settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, panelApi } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createAroundTheClockPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Around the Clock', rulesMd, drawMessage: 'Draw — round limit reached' });

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

        panel.finishUpdate(state, event);
    }

    return panelApi(panel, update);
}
