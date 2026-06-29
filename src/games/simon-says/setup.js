// Simon Says game setup panel

import '../game-panel.css';
import { formatRounds } from '../format.js';
import { createPlayerRoster } from '../roster.js';
import { attachOptionInfo } from '../option-info.js';
import { openRules } from '../../ui/rules-dialog.js';
import { meta } from './meta.js';
import rulesMd from './rules.md?raw';
import { settings, updateSettings } from '../../state/settings.js';

const D = {
    hitMode: 'any',
    scoring: 'flat',
    maxRounds: 10,
    onDraw: 'draw',
};

const ON_DRAW_LABELS = { draw: 'draw', continue: 'play until a winner' };

export function createSimonSaysSetup(container, onStart, onCancel) {
    const el = document.createElement('div');
    el.className = 'game-setup';

    const saved = { ...D, ...(settings().simonSays || {}) };

    el.innerHTML = `
    <div class="game-setup-header">
      <h3 class="game-setup-title">Simon Says</h3>
      <button type="button" class="btn btn-small game-setup-rules">Rules</button>
    </div>
    <p class="game-setup-synopsis">${meta.short}</p>
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
      <div class="game-setup-row">
        <label>On a tie <span class="game-setup-default">(default: ${ON_DRAW_LABELS[D.onDraw]})</span></label>
        <select data-field="onDraw">
          <option value="draw">Draw</option>
          <option value="continue">Play until a winner</option>
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
        hitMode: el.querySelector('[data-field="hitMode"]'),
        scoring: el.querySelector('[data-field="scoring"]'),
        maxRounds: el.querySelector('[data-field="maxRounds"]'),
        onDraw: el.querySelector('[data-field="onDraw"]'),
    };

    function applyValues(vals) {
        fields.hitMode.value = vals.hitMode;
        fields.scoring.value = vals.scoring;
        fields.maxRounds.value = String(vals.maxRounds);
        fields.onDraw.value = vals.onDraw;
    }

    function readValues() {
        return {
            hitMode: fields.hitMode.value,
            scoring: fields.scoring.value,
            maxRounds: parseInt(fields.maxRounds.value, 10),
            onDraw: fields.onDraw.value,
        };
    }

    applyValues(saved);

    attachOptionInfo(el, meta.options);

    el.querySelector('.game-setup-rules').addEventListener('click', () => {
        openRules(rulesMd);
    });

    el.querySelector('.game-setup-restore').addEventListener('click', () => {
        applyValues(D);
    });

    el.querySelector('.game-setup-back').addEventListener('click', () => {
        el.remove();
        onCancel();
    });

    el.querySelector('.game-setup-start').addEventListener('click', () => {
        const opts = readValues();

        updateSettings('simonSays.hitMode', opts.hitMode);
        updateSettings('simonSays.scoring', opts.scoring);
        updateSettings('simonSays.maxRounds', opts.maxRounds);
        updateSettings('simonSays.onDraw', opts.onDraw);

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
