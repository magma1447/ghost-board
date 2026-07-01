// Simon Says game panel — shows targets, scores, and hit/miss feedback

import './panel.css';
import { formatRoundLabel, settingsLine } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { defaults, fields } from './options.js';

export function createSimonSaysPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

    // Target display ("Simon says: 5, 17, 3"), shown between round and scoreboard.
    const sequenceLabel = document.createElement('div');
    sequenceLabel.className = 'game-sequence';
    panel.el.insertBefore(sequenceLabel, panel.scoreboard);

    function renderSequence(state) {
        sequenceLabel.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'game-sequence-label';
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

        // Past the round limit but still playing → sudden death (play-until-winner)
        const roundText = (!state.isGameOver && state.options.maxRounds !== null && state.round > state.options.maxRounds)
            ? `Sudden death · round ${state.round}`
            : formatRoundLabel(state.round, state.options.maxRounds);
        panel.setRound(roundText, match);

        renderSequence(state);

        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => String(p.score),
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
