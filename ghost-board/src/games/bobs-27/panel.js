import { suddenDeathRoundLabel, settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, panelApi, createTargetStrip } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

// Turn the round's target into a heads-up phrase for the "Aim at:" strip.
function aimText(target) {
    return target === 'bull' ? 'Double bull' : `D${target}`;
}

export function createBobs27Panel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: "Bob's 27", rulesMd, drawMessage: 'Draw — tied scores' });

    const target = createTargetStrip(panel, 'Aim at: ');

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(suddenDeathRoundLabel(state.round, state.sequence.length, state.isGameOver), match);

        target.set(aimText(state.target));

        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => String(p.score),
            infoFor: (p) => (p.out ? 'Out' : ''),
            dartMode: 'total',
            match,
        });

        panel.finishUpdate(state, event);
    }

    return panelApi(panel, update);
}
