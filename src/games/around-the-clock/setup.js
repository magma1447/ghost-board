// Around the Clock game setup panel

import '../game-panel.css';
import { formatBool, formatRounds } from '../format.js';
import { createPlayerRoster } from '../roster.js';
import { settings, updateSettings } from '../../state/settings.js';

const D = {
    bullFinish: 'single',
    hitMode: 'any',
    multiStep: false,
    maxRounds: 0,
};

const BULL_LABELS = { off: 'off', single: 'single bull', double: 'double bull' };

export function createAroundTheClockSetup(container, onStart, onCancel) {
    const el = document.createElement('div');
    el.className = 'game-setup';

    const saved = { ...D, ...(settings().aroundTheClock || {}) };

    el.innerHTML = `
    <h3 class="game-setup-title">Around the Clock</h3>
    <div data-roster></div>
    <div class="game-setup-fields">
      <div class="game-setup-row">
        <label>Bull finish <span class="game-setup-default">(default: ${BULL_LABELS[D.bullFinish]})</span></label>
        <select data-field="bullFinish">
          <option value="off">Off</option>
          <option value="single">Single bull</option>
          <option value="double">Double bull</option>
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
      <button class="btn game-setup-back">Back</button>
      <button class="btn btn-primary game-setup-start">Start Game</button>
      <button class="btn btn-small btn-danger game-setup-restore">Restore defaults</button>
    </div>
  `;

    const roster = createPlayerRoster(el.querySelector('[data-roster]'), { min: 1, max: 8 });

    const fields = {
        bullFinish: el.querySelector('[data-field="bullFinish"]'),
        hitMode: el.querySelector('[data-field="hitMode"]'),
        multiStep: el.querySelector('[data-field="multiStep"]'),
        maxRounds: el.querySelector('[data-field="maxRounds"]'),
    };

    function applyValues(vals) {
        fields.bullFinish.value = vals.bullFinish;
        fields.hitMode.value = vals.hitMode;
        fields.multiStep.checked = vals.multiStep;
        fields.maxRounds.value = String(vals.maxRounds);
    }

    function readValues() {
        return {
            bullFinish: fields.bullFinish.value,
            hitMode: fields.hitMode.value,
            multiStep: fields.multiStep.checked,
            maxRounds: parseInt(fields.maxRounds.value, 10),
        };
    }

    applyValues(saved);

    el.querySelector('.game-setup-restore').addEventListener('click', () => {
        applyValues(D);
    });

    el.querySelector('.game-setup-back').addEventListener('click', () => {
        el.remove();
        onCancel();
    });

    el.querySelector('.game-setup-start').addEventListener('click', () => {
        const opts = readValues();

        updateSettings('aroundTheClock.bullFinish', opts.bullFinish);
        updateSettings('aroundTheClock.hitMode', opts.hitMode);
        updateSettings('aroundTheClock.multiStep', opts.multiStep);
        updateSettings('aroundTheClock.maxRounds', opts.maxRounds);

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
