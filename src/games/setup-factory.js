// Shared setup-panel factory.
//
// Every game's setup panel is the same shell — a header with a Rules button, a
// one-line synopsis, a player roster, a list of option rows, a shared Match
// format section (legs / sets), and Back / Start / Restore buttons. Only the
// game option fields differ, so each game declares its fields and the factory
// builds the rest.
//
// A field is:
//   { name, label, type: 'select' | 'checkbox', defaultHint,
//     options: [{ value, label }],   // select only
//     valueType: 'int' }             // select only — parse value as integer
//
// `defaultHint` is the pre-formatted "(default: …)" text; games format it with
// their own helpers (formatBool, formatRounds, label maps) so the factory stays
// generic.
//
// config may also include `matchLock: { field, value }` — a game option that
// would allow a drawn leg (e.g. a round limit). When match play is selected
// (best-of legs/sets > 1) that option is forced to its no-draw value and
// disabled, since a leg must produce a winner.

import '../games/game-panel.css';
import { createPlayerRoster } from './roster.js';
import { createNumericSelect } from '../ui/common/numeric-select.js';
import { attachOptionInfo } from '../ui/common/option-info.js';
import { openRules } from '../ui/common/rules-dialog.js';
import { describeSettings, SETTINGS_SEPARATOR } from './format.js';
import { settings, updateSettings } from '../state/settings.js';

// Legs / sets are a cross-game concept, so they're built in here rather than
// declared per game. Best-of-1 means a single leg/set (match layer inactive).
const MATCH_FIELDS = [
    {
        name: 'legsBestOf', label: 'Legs', type: 'select', valueType: 'int',
        defaultHint: 'single leg',
        options: [
            { value: 1, label: 'Single leg' },
            { value: 3, label: 'Best of 3' },
            { value: 5, label: 'Best of 5' },
            { value: 7, label: 'Best of 7' },
        ],
    },
    {
        name: 'setsBestOf', label: 'Sets', type: 'select', valueType: 'int',
        defaultHint: 'single set',
        options: [
            { value: 1, label: 'Single set' },
            { value: 3, label: 'Best of 3' },
            { value: 5, label: 'Best of 5' },
        ],
    },
];

const MATCH_DEFAULTS = { legsBestOf: 1, setsBestOf: 1 };

const MATCH_OPTION_INFO = {
    legsBestOf: 'How many legs decide a set (best of N — first to the majority). A leg is one full game. Single leg = no leg play.',
    setsBestOf: 'How many sets decide the match (best of N). A set goes to whoever takes the majority of its legs. Single set = no set play.',
};

function fieldControl(field) {
    if (field.type === 'checkbox') {
        return `<input type="checkbox" data-field="${field.name}">`;
    }
    if (field.type === 'number') {
        // Mount point for the numeric preset+custom widget (built in JS below).
        return `<div data-field-numeric="${field.name}"></div>`;
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

// A collapsible section: a header (chevron + title + live summary) over a body
// of field rows. Collapsed by default; the header toggles it.
function sectionGroup(title, fieldList, key) {
    return `<div class="game-setup-group">
      <button type="button" class="game-setup-section" data-toggle="${key}">
        <span class="game-setup-section-chevron" aria-hidden="true"></span>
        <span class="game-setup-section-title">${title}</span>
        <span class="game-setup-section-summary" data-summary="${key}"></span>
      </button>
      <div class="game-setup-group-body" data-body="${key}" hidden>
        ${fieldList.map(fieldRow).join('\n        ')}
      </div>
    </div>`;
}

// config: { title, settingsKey, defaults, fields, roster: { min, max }, meta,
//           rulesMd, matchLock? }
export function createGameSetup(container, onStart, onCancel, config) {
    const { title, settingsKey, defaults, fields, roster: rosterLimits, meta, rulesMd, matchLock } = config;

    // Game fields plus the shared match fields; defaults extended likewise.
    const allFields = [...fields, ...MATCH_FIELDS];
    const allDefaults = { ...defaults, ...MATCH_DEFAULTS };

    const el = document.createElement('div');
    el.className = 'game-setup';

    const saved = { ...allDefaults, ...(settings()[settingsKey] || {}) };

    el.innerHTML = `
    <div class="game-setup-header">
      <h3 class="game-setup-title">${title}</h3>
      <button type="button" class="btn btn-small game-setup-rules">Rules</button>
    </div>
    <p class="game-setup-synopsis">${meta.short}</p>
    <div data-roster></div>
    <div class="game-setup-fields">
      ${sectionGroup('Match format', MATCH_FIELDS, 'match')}
      ${sectionGroup('Game options', fields, 'options')}
    </div>
    <div class="game-setup-buttons">
      <button class="btn game-setup-back">Back</button>
      <button class="btn btn-primary game-setup-start">Start Game</button>
      <button class="btn btn-small btn-danger game-setup-restore">Restore defaults</button>
    </div>
  `;

    const roster = createPlayerRoster(el.querySelector('[data-roster]'), rosterLimits);

    const inputs = {};
    allFields.forEach((field) => {
        if (field.type === 'number') {
            // Numeric preset+custom widget; stored by its getValue/setValue API.
            const widget = createNumericSelect({
                presets: field.presets,
                min: field.min,
                max: field.max,
                value: saved[field.name],
            });
            el.querySelector(`[data-field-numeric="${field.name}"]`).appendChild(widget);
            inputs[field.name] = widget;
        } else {
            inputs[field.name] = el.querySelector(`[data-field="${field.name}"]`);
        }
    });

    // --- Match lock: force the draw-prone option to its no-draw value while
    // match play is selected (a leg must have a winner). ---
    const lockInput = matchLock ? inputs[matchLock.field] : null;
    let lockNote = null;
    if (lockInput) {
        const row = lockInput.closest('.game-setup-row');
        lockNote = document.createElement('span');
        lockNote.className = 'game-setup-lock-note';
        lockNote.textContent = ' · locked for match play';
        lockNote.hidden = true;
        row.querySelector('label').appendChild(lockNote);
    }
    let locked = false;
    let lockPrevValue = null;

    // --- Sets require more than one leg (a set wraps multiple legs — sets of a
    // single leg are just legs). Lock Sets to 1 until Legs is Best-of-3+. ---
    const setsInput = inputs.setsBestOf;
    const setsNote = document.createElement('span');
    setsNote.className = 'game-setup-lock-note';
    setsNote.textContent = ' · needs multiple legs';
    setsNote.hidden = true;
    setsInput.closest('.game-setup-row').querySelector('label').appendChild(setsNote);

    function applySetsAvailability() {
        const legsActive = parseInt(inputs.legsBestOf.value, 10) > 1;
        setsInput.disabled = !legsActive;
        setsNote.hidden = legsActive;
        if (!legsActive) {
            setsInput.value = '1';
        }
    }

    function isMatchSelected() {
        return parseInt(inputs.legsBestOf.value, 10) > 1 || parseInt(inputs.setsBestOf.value, 10) > 1;
    }

    function applyMatchLock() {
        if (!lockInput) {
            return;
        }
        const match = isMatchSelected();
        if (match && !locked) {
            lockPrevValue = lockInput.value;
            lockInput.value = String(matchLock.value);
            lockInput.disabled = true;
            lockNote.hidden = false;
            locked = true;
        } else if (!match && locked) {
            lockInput.value = lockPrevValue;
            lockInput.disabled = false;
            lockNote.hidden = true;
            locked = false;
        }
    }

    function resetLock() {
        if (lockInput) {
            lockInput.disabled = false;
            lockNote.hidden = true;
        }
        locked = false;
        lockPrevValue = null;
    }

    function applyValues(vals) {
        allFields.forEach((field) => {
            const input = inputs[field.name];
            if (field.type === 'checkbox') {
                input.checked = vals[field.name];
            } else if (field.type === 'number') {
                input.setValue(vals[field.name]);
            } else {
                input.value = String(vals[field.name]);
            }
        });
        // Re-sync sets availability + the no-draw lock from the applied values
        applySetsAvailability();
        resetLock();
        applyMatchLock();
        updateSummaries();
    }

    // Collapsed-section summaries, so the config is visible without expanding.
    function summarizeMatch(vals) {
        if (vals.legsBestOf <= 1 && vals.setsBestOf <= 1) {
            return 'Single game';
        }
        const parts = [];
        if (vals.legsBestOf > 1) {
            parts.push(`Best of ${vals.legsBestOf} legs`);
        }
        if (vals.setsBestOf > 1) {
            parts.push(`best of ${vals.setsBestOf} sets`);
        }
        return parts.join(', ');
    }

    // Checked toggles + any select changed from default, via the shared helper.
    function summarizeOptions(vals) {
        const tokens = describeSettings(fields, vals, defaults);
        return tokens.length > 0 ? tokens.join(SETTINGS_SEPARATOR) : 'Defaults';
    }

    function updateSummaries() {
        const vals = readValues();
        el.querySelector('[data-summary="match"]').textContent = summarizeMatch(vals);
        el.querySelector('[data-summary="options"]').textContent = summarizeOptions(vals);
    }

    function readValues() {
        const result = {};
        allFields.forEach((field) => {
            const input = inputs[field.name];
            if (field.type === 'checkbox') {
                result[field.name] = input.checked;
            } else if (field.type === 'number') {
                result[field.name] = input.getValue();
            } else if (field.valueType === 'int') {
                result[field.name] = parseInt(input.value, 10);
            } else {
                result[field.name] = input.value;
            }
        });
        return result;
    }

    // Re-evaluate sets availability + the no-draw lock when the format changes
    inputs.legsBestOf.addEventListener('change', () => {
        applySetsAvailability();
        applyMatchLock();
    });
    inputs.setsBestOf.addEventListener('change', applyMatchLock);

    // Collapsible section headers
    el.querySelectorAll('.game-setup-section').forEach((btn) => {
        btn.addEventListener('click', () => {
            const body = el.querySelector(`[data-body="${btn.dataset.toggle}"]`);
            const willOpen = body.hidden;
            body.hidden = !willOpen;
            btn.classList.toggle('open', willOpen);
        });
    });

    // Keep the section summaries in sync with any field change
    el.querySelector('.game-setup-fields').addEventListener('change', updateSummaries);

    // Load user's saved preferences
    applyValues(saved);

    // "?" info popovers per option (game options + the match fields)
    attachOptionInfo(el, { ...meta.options, ...MATCH_OPTION_INFO });

    el.querySelector('.game-setup-rules').addEventListener('click', () => {
        openRules(rulesMd);
    });

    // Restore defaults button — resets to real defaults, not user's saved prefs
    el.querySelector('.game-setup-restore').addEventListener('click', () => {
        applyValues(allDefaults);
    });

    el.querySelector('.game-setup-back').addEventListener('click', () => {
        el.remove();
        onCancel();
    });

    el.querySelector('.game-setup-start').addEventListener('click', () => {
        const opts = readValues();

        // Persist as user's defaults for next time. Skip the match-locked field
        // while it's forced, so the user's own (non-match) choice survives.
        Object.keys(opts).forEach((key) => {
            if (locked && matchLock && key === matchLock.field) {
                return;
            }
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
