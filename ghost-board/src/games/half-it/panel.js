import './panel.css';
import { formatRoundLabel, settingsLine } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

// Turn the round's target into a heads-up phrase for the "Aim at:" strip.
function aimText(target) {
    if (target === 'double') {
        return 'Doubles';
    }
    if (target === 'treble') {
        return 'Trebles';
    }
    if (target === 'bull') {
        return 'Bull';
    }
    return String(target);
}

export function createHalfItPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Half It', rulesMd });

    const targetLabel = document.createElement('div');
    targetLabel.className = 'game-half-it-target';
    panel.el.insertBefore(targetLabel, panel.scoreboard);

    function renderTarget(state) {
        targetLabel.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'game-half-it-target-label';
        label.textContent = 'Aim at: ';
        const value = document.createElement('span');
        value.className = 'game-half-it-target-value';
        value.textContent = aimText(state.target);
        targetLabel.append(label, value);
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));

        const roundText = (!state.isGameOver && state.round > state.sequence.length)
            ? `Sudden death · round ${state.round}`
            : formatRoundLabel(state.round, state.sequence.length);
        panel.setRound(roundText, match);

        renderTarget(state);

        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => String(p.score),
            dartMode: 'total',
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
