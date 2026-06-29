// Shared setup-panel factory.
//
// Every game's setup panel is the same shell — a header with a Rules button, a
// one-line synopsis, a player roster, a list of option rows, and Back / Start /
// Restore buttons. Only the option fields differ between games, so each game
// declares its fields and the factory builds the rest.
//
// A field is:
//   { name, label, type: 'select' | 'checkbox', defaultHint,
//     options: [{ value, label }],   // select only
//     valueType: 'int' }             // select only — parse value as integer
//
// `defaultHint` is the pre-formatted "(default: …)" text; games format it with
// their own helpers (formatBool, formatRounds, label maps) so the factory stays
// generic.

import '../games/game-panel.css';
import { createPlayerRoster } from './roster.js';
import { attachOptionInfo } from './option-info.js';
import { openRules } from '../ui/rules-dialog.js';
import { settings, updateSettings } from '../state/settings.js';

function fieldControl(field) {
    if (field.type === 'checkbox') {
        return `<input type="checkbox" data-field="${field.name}">`;
    }
    const options = field.options
        .map((opt) => `<option value="${opt.value}">${opt.label}</option>`)
        .join('\n          ');
    return `<select data-field="${field.name}">
          ${options}
        </select>`;
}

function fieldRow(field) {
    return `<div class="game-setup-row">
        <label>${field.label} <span class="game-setup-default">(default: ${field.defaultHint})</span></label>
        ${fieldControl(field)}
      </div>`;
}

// config: { title, settingsKey, defaults, fields, roster: { min, max }, meta, rulesMd }
export function createGameSetup(container, onStart, onCancel, config) {
    const { title, settingsKey, defaults, fields, roster: rosterLimits, meta, rulesMd } = config;

    const el = document.createElement('div');
    el.className = 'game-setup';

    const saved = { ...defaults, ...(settings()[settingsKey] || {}) };

    el.innerHTML = `
    <div class="game-setup-header">
      <h3 class="game-setup-title">${title}</h3>
      <button type="button" class="btn btn-small game-setup-rules">Rules</button>
    </div>
    <p class="game-setup-synopsis">${meta.short}</p>
    <div data-roster></div>
    <div class="game-setup-fields">
      ${fields.map(fieldRow).join('\n      ')}
    </div>
    <div class="game-setup-buttons">
      <button class="btn game-setup-back">Back</button>
      <button class="btn btn-primary game-setup-start">Start Game</button>
      <button class="btn btn-small btn-danger game-setup-restore">Restore defaults</button>
    </div>
  `;

    const roster = createPlayerRoster(el.querySelector('[data-roster]'), rosterLimits);

    const inputs = {};
    fields.forEach((field) => {
        inputs[field.name] = el.querySelector(`[data-field="${field.name}"]`);
    });

    function applyValues(vals) {
        fields.forEach((field) => {
            const input = inputs[field.name];
            if (field.type === 'checkbox') {
                input.checked = vals[field.name];
            } else {
                input.value = String(vals[field.name]);
            }
        });
    }

    function readValues() {
        const result = {};
        fields.forEach((field) => {
            const input = inputs[field.name];
            if (field.type === 'checkbox') {
                result[field.name] = input.checked;
            } else if (field.valueType === 'int') {
                result[field.name] = parseInt(input.value, 10);
            } else {
                result[field.name] = input.value;
            }
        });
        return result;
    }

    // Load user's saved preferences
    applyValues(saved);

    // "?" info popovers per option
    attachOptionInfo(el, meta.options);

    el.querySelector('.game-setup-rules').addEventListener('click', () => {
        openRules(rulesMd);
    });

    // Restore defaults button — resets to real defaults, not user's saved prefs
    el.querySelector('.game-setup-restore').addEventListener('click', () => {
        applyValues(defaults);
    });

    el.querySelector('.game-setup-back').addEventListener('click', () => {
        el.remove();
        onCancel();
    });

    el.querySelector('.game-setup-start').addEventListener('click', () => {
        const opts = readValues();

        // Persist as user's defaults for next time
        Object.keys(opts).forEach((key) => {
            updateSettings(`${settingsKey}.${key}`, opts[key]);
        });

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
