import './panel.css';
import { formatRoundLabel, settingsLine } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

// Turn the round's target into a heads-up phrase for the "Aim at:" strip.
function aimText(target) {
    return target === 'bull' ? 'Double bull' : `D${target}`;
}

export function createBobs27Panel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: "Bob's 27", rulesMd });

    const targetLabel = document.createElement('div');
    targetLabel.className = 'game-bobs-27-target';
    panel.el.insertBefore(targetLabel, panel.scoreboard);

    function renderTarget(state) {
        targetLabel.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'game-bobs-27-target-label';
        label.textContent = 'Aim at: ';
        const value = document.createElement('span');
        value.className = 'game-bobs-27-target-value';
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
            infoFor: (p) => (p.out ? 'Out' : ''),
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
