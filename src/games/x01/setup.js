// X01 game setup panel

import { settings, updateSettings, X01_DEFAULTS } from '../../state/settings.js';

const D = X01_DEFAULTS;

function fmtBool(v) {
  return v ? 'on' : 'off';
}

function fmtRounds(v) {
  return v === 0 ? 'no limit' : String(v);
}

function fmtCheckout(v) {
  return v === 0 ? 'off' : String(v);
}

export function createX01Setup(container, onStart) {
  const el = document.createElement('div');
  el.className = 'x01-setup';

  const saved = settings().x01;

  el.innerHTML = `
    <h3 class="x01-setup-title">X01 Game</h3>
    <div class="x01-setup-fields">
      <div class="x01-setup-row">
        <label>Start score <span class="x01-default">(default: ${D.startingScore})</span></label>
        <select data-field="startingScore">
          <option value="301">301</option>
          <option value="501">501</option>
          <option value="701">701</option>
          <option value="1001">1001</option>
        </select>
      </div>
      <div class="x01-setup-row">
        <label>Double in <span class="x01-default">(default: ${fmtBool(D.doubleIn)})</span></label>
        <input type="checkbox" data-field="doubleIn">
      </div>
      <div class="x01-setup-row">
        <label>Double out <span class="x01-default">(default: ${fmtBool(D.doubleOut)})</span></label>
        <input type="checkbox" data-field="doubleOut">
      </div>
      <div class="x01-setup-row">
        <label>Bull scoring <span class="x01-default">(default: ${D.bullMode})</span></label>
        <select data-field="bullMode">
          <option value="25/50">25 / 50 (standard)</option>
          <option value="50/50">50 / 50</option>
        </select>
      </div>
      <div class="x01-setup-row">
        <label>Max rounds <span class="x01-default">(default: ${fmtRounds(D.maxRounds)})</span></label>
        <select data-field="maxRounds">
          <option value="0">No limit</option>
          <option value="15">15</option>
          <option value="20">20</option>
          <option value="25">25</option>
          <option value="30">30</option>
        </select>
      </div>
      <div class="x01-setup-row">
        <label>Checkout calls below <span class="x01-default">(default: ${fmtCheckout(D.checkoutThreshold)})</span></label>
        <select data-field="checkoutThreshold">
          <option value="0">Off</option>
          <option value="60">60</option>
          <option value="130">130</option>
          <option value="140">140</option>
          <option value="170">170</option>
          <option value="180">180</option>
        </select>
      </div>
    </div>
    <div class="x01-setup-buttons">
      <button class="x01-setup-start">Start Game</button>
      <button class="x01-setup-restore">Restore defaults</button>
    </div>
  `;

  const fields = {
    startingScore: el.querySelector('[data-field="startingScore"]'),
    doubleIn: el.querySelector('[data-field="doubleIn"]'),
    doubleOut: el.querySelector('[data-field="doubleOut"]'),
    bullMode: el.querySelector('[data-field="bullMode"]'),
    maxRounds: el.querySelector('[data-field="maxRounds"]'),
    checkoutThreshold: el.querySelector('[data-field="checkoutThreshold"]'),
  };

  function applyValues(vals) {
    fields.startingScore.value = String(vals.startingScore);
    fields.doubleIn.checked = vals.doubleIn;
    fields.doubleOut.checked = vals.doubleOut;
    fields.bullMode.value = vals.bullMode;
    fields.maxRounds.value = String(vals.maxRounds);
    fields.checkoutThreshold.value = String(vals.checkoutThreshold);
  }

  function readValues() {
    return {
      startingScore: parseInt(fields.startingScore.value, 10),
      doubleIn: fields.doubleIn.checked,
      doubleOut: fields.doubleOut.checked,
      bullMode: fields.bullMode.value,
      maxRounds: parseInt(fields.maxRounds.value, 10),
      checkoutThreshold: parseInt(fields.checkoutThreshold.value, 10),
    };
  }

  // Load user's saved preferences
  applyValues(saved);

  // Restore defaults button — resets to real defaults, not user's saved prefs
  el.querySelector('.x01-setup-restore').addEventListener('click', () => {
    applyValues(D);
  });

  el.querySelector('.x01-setup-start').addEventListener('click', () => {
    const opts = readValues();

    // Persist as user's defaults for next time
    updateSettings('x01.startingScore', opts.startingScore);
    updateSettings('x01.doubleIn', opts.doubleIn);
    updateSettings('x01.doubleOut', opts.doubleOut);
    updateSettings('x01.bullMode', opts.bullMode);
    updateSettings('x01.maxRounds', opts.maxRounds);
    updateSettings('x01.checkoutThreshold', opts.checkoutThreshold);

    el.remove();
    onStart(opts);
  });

  container.appendChild(el);

  function destroy() {
    el.remove();
  }

  return { destroy };
}
