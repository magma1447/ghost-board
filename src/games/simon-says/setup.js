// Simon Says game setup panel

import '../game-panel.css';
import { formatRounds } from '../format.js';
import { createPlayerRoster } from '../roster.js';
import { settings, updateSettings } from '../../state/settings.js';

const D = {
    hitMode: 'any',
    scoring: 'flat',
    maxRounds: 10,
};

export function createSimonSaysSetup(container, onStart) {
    const el = document.createElement('div');
    el.className = 'game-setup';

    const saved = { ...D, ...(settings().simonSays || {}) };

    el.innerHTML = `
    <h3 class="game-setup-title">Simon Says</h3>
    <div data-roster></div>
    <div class="game-setup-fields">
      <div class="game-setup-row">
        <label>Hit mode <span class="game-setup-default">(default: ${D.hitMode})</span></label>
        <select data-field="hitMode">
          <option value="any">Any</option>
          <option value="doubles">Doubles only</option>
          <option value="triples">Triples only</option>
        </select>
      </div>
      <div class="game-setup-row">
        <label>Scoring <span class="game-setup-default">(default: ${D.scoring})</span></label>
        <select data-field="scoring">
          <option value="flat">Flat (1, 1, 1)</option>
          <option value="staggered">Staggered (1, 2, 3)</option>
        </select>
      </div>
      <div class="game-setup-row">
        <label>Rounds <span class="game-setup-default">(default: ${formatRounds(D.maxRounds)})</span></label>
        <select data-field="maxRounds">
          <option value="0">No limit</option>
          <option value="5">5</option>
          <option value="10">10</option>
          <option value="15">15</option>
          <option value="20">20</option>
        </select>
      </div>
    </div>
    <div class="game-setup-buttons">
      <button class="game-setup-start">Start Game</button>
      <button class="game-setup-restore">Restore defaults</button>
    </div>
  `;

    const roster = createPlayerRoster(el.querySelector('[data-roster]'), { min: 1, max: 8 });

    const fields = {
        hitMode: el.querySelector('[data-field="hitMode"]'),
        scoring: el.querySelector('[data-field="scoring"]'),
        maxRounds: el.querySelector('[data-field="maxRounds"]'),
    };

    function applyValues(vals) {
        fields.hitMode.value = vals.hitMode;
        fields.scoring.value = vals.scoring;
        fields.maxRounds.value = String(vals.maxRounds);
    }

    function readValues() {
        return {
            hitMode: fields.hitMode.value,
            scoring: fields.scoring.value,
            maxRounds: parseInt(fields.maxRounds.value, 10),
        };
    }

    applyValues(saved);

    el.querySelector('.game-setup-restore').addEventListener('click', () => {
        applyValues(D);
    });

    el.querySelector('.game-setup-start').addEventListener('click', () => {
        const opts = readValues();

        updateSettings('simonSays.hitMode', opts.hitMode);
        updateSettings('simonSays.scoring', opts.scoring);
        updateSettings('simonSays.maxRounds', opts.maxRounds);

        const playerUuids = roster.commit();
        if (!playerUuids) {
            return; // too few players selected — roster shows the error
        }

        el.remove();
        onStart({ ...opts, numPlayers: playerUuids.length, playerUuids });
    });

    container.appendChild(el);

    function destroy() {
        roster.destroy();
        el.remove();
    }

    return { destroy };
}
