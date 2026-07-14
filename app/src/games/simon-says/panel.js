// Simon Says game panel — shows targets, scores, and hit/miss feedback

import './panel.css';
import { suddenDeathRoundLabel, settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, panelApi } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createSimonSaysPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Simon Says', rulesMd, drawMessage: 'Draw — tied scores' });

    // Target display ("Simon says: 5, 17, 3"), shown between round and
    // scoreboard. Multi-valued with per-number hit colouring, so it renders its
    // own spans but reuses the shared target-strip container/label styling.
    const sequenceLabel = document.createElement('div');
    sequenceLabel.className = 'game-target-strip';
    panel.el.insertBefore(sequenceLabel, panel.scoreboard);

    function renderSequence(state) {
        sequenceLabel.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'game-target-label';
        label.textContent = 'Simon says: ';
        sequenceLabel.appendChild(label);

        for (let i = 0; i < state.sequence.length; i++) {
            if (i > 0) {
                sequenceLabel.appendChild(document.createTextNode(', '));
            }
            const span = document.createElement('span');
            span.textContent = String(state.sequence[i]);
            // Green when hit, orange when still needed
            span.className = state.targetsHit[i] ? 'game-dart-hit' : 'game-sequence-current';
            sequenceLabel.appendChild(span);
        }
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));

        panel.setRound(suddenDeathRoundLabel(state.round, state.options.maxRounds, state.isGameOver), match);

        renderSequence(state);

        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => String(p.score),
            match,
        });

        panel.finishUpdate(state, event);
    }

    return panelApi(panel, update);
}
