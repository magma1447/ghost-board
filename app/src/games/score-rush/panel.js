// Score Rush game panel — running totals racing to a target score.

import { formatRoundLabel, settingsLine, averageLabel } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, panelApi } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createScoreRushPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Score Rush', rulesMd });

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

        panel.finishUpdate(state, event);
    }

    return panelApi(panel, update);
}
