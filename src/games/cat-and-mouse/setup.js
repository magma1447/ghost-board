// Cat and Mouse game setup panel

import '../game-panel.css';
import { formatBool, formatRounds } from '../format.js';
import { settings, updateSettings } from '../../state/settings.js';

const D = {
    gap: 1,
    hitMode: 'any',
    multiStep: false,
    maxRounds: 0,
};

export function createCatAndMouseSetup(container, onStart) {
    const el = document.createElement('div');
    el.className = 'game-setup';

    const saved = { ...D, ...(settings().catAndMouse || {}) };

    el.innerHTML = `
    <h3 class="game-setup-title">Cat and Mouse</h3>
    <div class="game-setup-fields">
      <div class="game-setup-row">
        <label>Head start <span class="game-setup-default">(default: ${D.gap})</span></label>
        <select data-field="gap">
          <option value="1">1</option>
          <option value="2">2</option>
          <option value="3">3</option>
          <option value="4">4</option>
          <option value="5">5</option>
        </select>
      </div>
      <div class="game-setup-row">
        <label>Hit mode <span class="game-setup-default">(default: ${D.hitMode})</span></label>
        <select data-field="hitMode">
          <option value="any">Any</option>
          <option value="doubles">Doubles only</option>
          <option value="triples">Triples only</option>
        </select>
      </div>
      <div class="game-setup-row">
        <label>Multi-step <span class="game-setup-default">(default: ${formatBool(D.multiStep)})</span></label>
        <input type="checkbox" data-field="multiStep">
      </div>
      <div class="game-setup-row">
        <label>Max rounds <span class="game-setup-default">(default: ${formatRounds(D.maxRounds)})</span></label>
        <select data-field="maxRounds">
          <option value="0">No limit</option>
          <option value="15">15</option>
          <option value="20">20</option>
          <option value="25">25</option>
          <option value="30">30</option>
        </select>
      </div>
    </div>
    <div class="game-setup-buttons">
      <button class="game-setup-start">Start Game</button>
      <button class="game-setup-restore">Restore defaults</button>
    </div>
  `;

    const fields = {
        gap: el.querySelector('[data-field="gap"]'),
        hitMode: el.querySelector('[data-field="hitMode"]'),
        multiStep: el.querySelector('[data-field="multiStep"]'),
        maxRounds: el.querySelector('[data-field="maxRounds"]'),
    };

    function applyValues(vals) {
        fields.gap.value = String(vals.gap);
        fields.hitMode.value = vals.hitMode;
        fields.multiStep.checked = vals.multiStep;
        fields.maxRounds.value = String(vals.maxRounds);
    }

    function readValues() {
        return {
            gap: parseInt(fields.gap.value, 10),
            hitMode: fields.hitMode.value,
            multiStep: fields.multiStep.checked,
            maxRounds: parseInt(fields.maxRounds.value, 10),
        };
    }

    applyValues(saved);

    el.querySelector('.game-setup-restore').addEventListener('click', () => {
        applyValues(D);
    });

    el.querySelector('.game-setup-start').addEventListener('click', () => {
        const opts = readValues();

        updateSettings('catAndMouse.gap', opts.gap);
        updateSettings('catAndMouse.hitMode', opts.hitMode);
        updateSettings('catAndMouse.multiStep', opts.multiStep);
        updateSettings('catAndMouse.maxRounds', opts.maxRounds);

        el.remove();
        onStart(opts);
    });

    container.appendChild(el);

    function destroy() {
        el.remove();
    }

    return { destroy };
}
