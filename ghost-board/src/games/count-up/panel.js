// Count Up game panel — running totals and each turn's darts with its sum.

import { suddenDeathRoundLabel, settingsLine, averageLabel } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, panelApi } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createCountUpPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Count Up', rulesMd, drawMessage: 'Draw — tied scores' });

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));

        panel.setRound(suddenDeathRoundLabel(state.round, state.options.maxRounds, state.isGameOver), match);

        renderScoreboard(panel.scoreboard, state, {
            infoFor: averageLabel,
            valueFor: (p) => String(p.score),
            dartMode: 'total', // show the turn's darts joined with their sum
            match,
        });

        panel.finishUpdate(state, event);
    }

    return panelApi(panel, update);
}
