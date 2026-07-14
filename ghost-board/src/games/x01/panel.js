// X01 game panel — renders x01 game state

import { formatRoundLabel, settingsLine, averageLabel } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, panelApi } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import { checkoutFor } from './checkout-sequence.js';
import rulesMd from './rules.md?raw';

export function createX01Panel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'X01', rulesMd, drawMessage: 'Draw — round limit reached' });

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

        if (event === 'bust') {
            panel.showBanner('BUST!', 'bust');
        }
        panel.finishUpdate(state, event);
    }

    return panelApi(panel, update);
}
