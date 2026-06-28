// Around the Clock game setup panel

import { settings, updateSettings } from '../../state/settings.js';

const D = {
  bullFinish: 'single',
  hitMode: 'any',
  multiStep: false,
  maxRounds: 0,
};

function fmtBool(v) {
  return v ? 'on' : 'off';
}

function fmtRounds(v) {
  return v === 0 ? 'no limit' : String(v);
}

const BULL_LABELS = { off: 'off', single: 'single bull', double: 'double bull' };

export function createAroundTheClockSetup(container, onStart) {
  const el = document.createElement('div');
  el.className = 'atc-setup';

  const saved = { ...D, ...(settings().aroundTheClock || {}) };

  el.innerHTML = `
    <h3 class="atc-setup-title">Around the Clock</h3>
    <div class="atc-setup-fields">
      <div class="atc-setup-row">
        <label>Bull finish <span class="atc-default">(default: ${BULL_LABELS[D.bullFinish]})</span></label>
        <select data-field="bullFinish">
          <option value="off">Off</option>
          <option value="single">Single bull</option>
          <option value="double">Double bull</option>
        </select>
      </div>
      <div class="atc-setup-row">
        <label>Hit mode <span class="atc-default">(default: ${D.hitMode})</span></label>
        <select data-field="hitMode">
          <option value="any">Any</option>
          <option value="doubles">Doubles only</option>
          <option value="triples">Triples only</option>
        </select>
      </div>
      <div class="atc-setup-row">
        <label>Multi-step <span class="atc-default">(default: ${fmtBool(D.multiStep)})</span></label>
        <input type="checkbox" data-field="multiStep">
      </div>
      <div class="atc-setup-row">
        <label>Max rounds <span class="atc-default">(default: ${fmtRounds(D.maxRounds)})</span></label>
        <select data-field="maxRounds">
          <option value="0">No limit</option>
          <option value="15">15</option>
          <option value="20">20</option>
          <option value="25">25</option>
          <option value="30">30</option>
        </select>
      </div>
    </div>
    <div class="atc-setup-buttons">
      <button class="atc-setup-start">Start Game</button>
      <button class="atc-setup-restore">Restore defaults</button>
    </div>
  `;

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

  el.querySelector('.atc-setup-restore').addEventListener('click', () => {
    applyValues(D);
  });

  el.querySelector('.atc-setup-start').addEventListener('click', () => {
    const opts = readValues();

    updateSettings('aroundTheClock.bullFinish', opts.bullFinish);
    updateSettings('aroundTheClock.hitMode', opts.hitMode);
    updateSettings('aroundTheClock.multiStep', opts.multiStep);
    updateSettings('aroundTheClock.maxRounds', opts.maxRounds);

    el.remove();
    onStart(opts);
  });

  container.appendChild(el);

  function destroy() {
    el.remove();
  }

  return { destroy };
}
