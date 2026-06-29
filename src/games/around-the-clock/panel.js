// Around the Clock game panel

import { formatRoundLabel } from '../format.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';

export function createAroundTheClockPanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

    function formatTarget(target, state) {
        if (target > state.finalTarget) {
            return 'Done';
        }
        if (target === 21) {
            return 'Bull';
        }
        return String(target);
    }

    function buildRulesText(state) {
        const tags = [];
        if (state.bullFinish !== 'off') {
            tags.push(state.bullFinish === 'double' ? 'D-Bull finish' : 'Bull finish');
        }
        if (state.hitMode !== 'any') {
            tags.push(state.hitMode === 'doubles' ? 'Doubles' : 'Triples');
        }
        if (state.multiStep) {
            tags.push('Multi-step');
        }
        if (state.maxRounds > 0) {
            tags.push(`${state.maxRounds} rnd`);
        }
        return tags.length > 0 ? tags.join(' · ') : '';
    }

    function update(state, event, match) {
        panel.setRules(buildRulesText(state));
        panel.setRound(formatRoundLabel(state.round, state.maxRounds), match);

        renderScoreboard(panel.scoreboard, state, {
            valueFor: (p) => '→ ' + formatTarget(p.currentTarget, state),
            match,
        });

        panel.nextBtn.disabled = state.gameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — round limit reached', 'draw');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, showBanner: panel.showBanner };
}
