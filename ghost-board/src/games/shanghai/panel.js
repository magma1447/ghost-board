import { suddenDeathRoundLabel, settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, panelApi, createTargetStrip } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createShanghaiPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Shanghai', rulesMd, drawMessage: 'Draw — tied scores' });

    const target = createTargetStrip(panel, 'Target: ');

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(suddenDeathRoundLabel(state.round, state.options.maxRounds, state.isGameOver), match);

        target.set(String(state.target));

        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => String(p.score),
            dartMode: 'total',
            match,
        });

        panel.finishUpdate(state, event);
    }

    return panelApi(panel, update);
}
