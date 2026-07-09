import './panel.css';
import { formatRoundLabel, settingsLine } from '../../game-engine/shared/format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../../game-engine/core/panel-factory.js';
import { defaults, fields } from './options.js';
import rulesMd from './rules.md?raw';

export function createShanghaiPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks, { title: 'Shanghai', rulesMd });

    const targetLabel = document.createElement('div');
    targetLabel.className = 'game-shanghai-target';
    panel.el.insertBefore(targetLabel, panel.scoreboard);

    function renderTarget(state) {
        targetLabel.innerHTML = '';
        const label = document.createElement('span');
        label.className = 'game-shanghai-target-label';
        label.textContent = 'Target: ';
        const value = document.createElement('span');
        value.className = 'game-shanghai-target-value';
        value.textContent = String(state.target);
        targetLabel.append(label, value);
    }

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));

        const roundText = (!state.isGameOver && state.options.maxRounds !== null && state.round > state.options.maxRounds)
            ? `Sudden death · round ${state.round}`
            : formatRoundLabel(state.round, state.options.maxRounds);
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
