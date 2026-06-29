// Cat and Mouse game panel

import { formatRoundLabel, settingsLine } from '../format.js';
import { createPlayer } from '../../state/players.js';
import { createGamePanel, renderScoreboard, winnerName } from '../panel-factory.js';
import { defaults, fields } from './options.js';

export function createCatAndMousePanel(container, callbacks) {
    const panel = createGamePanel(container, callbacks);

    // Chase summary (single line — the gap is the same for both players),
    // shown between the scoreboard and the banner.
    const gapLine = document.createElement('div');
    gapLine.className = 'game-summary';
    panel.el.insertBefore(gapLine, panel.banner);

    function update(state, event, match) {
        panel.setRules(settingsLine(fields, state.options, defaults));
        panel.setRound(formatRoundLabel(state.round, state.options.maxRounds), match);

        renderScoreboard(panel.scoreboard, state, {
            // Show the human name with the fixed role, e.g. "Luke the Nuke (Cat)"
            nameFor: (p) => {
                const playerName = createPlayer(p.uuid).getName();
                return p.role ? `${playerName} (${p.role})` : playerName;
            },
            valueFor: (p) => '→ ' + p.currentTarget,
            // turn.display accumulates across sprint sets
            dartsFor: (s, p, isCurrent) => (isCurrent ? s.turn.display : (p.lastDarts || [])),
            match,
        });

        // Chase gap, from the mouse's perspective (it starts ahead and the
        // cat catches when this reaches 0). = gap + mouse.progress - cat.progress.
        const ahead = state.options.gap + state.players[0].progress - state.players[1].progress;
        gapLine.textContent = `Mouse is ${ahead} ahead`;
        gapLine.hidden = state.isGameOver;

        panel.nextBtn.disabled = state.isGameOver;

        if (event === 'win') {
            panel.showBanner(`${winnerName(state)} wins!`, 'win');
        } else if (event === 'draw') {
            panel.showBanner('Draw — round limit reached', 'draw');
        }
    }

    return { update, destroy: panel.destroy, nextBtn: panel.nextBtn, rematchBtn: panel.rematchBtn, showBanner: panel.showBanner };
}
