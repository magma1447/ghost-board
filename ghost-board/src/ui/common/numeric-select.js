// Reusable numeric option control, modelled on the player roster's select:
// a dropdown of preset values plus a "Custom…" option that swaps the control
// to an inline integer input (✓ / ✕, Enter / Escape), bounded by [min, max].
// A committed custom value reappears in the dropdown as its own option.
//
// Presets are valid by definition, so they bypass the min/max clamp — only the
// free-text custom input is bounded. Preset values may be non-numeric (e.g.
// null for "No limit"); they survive the <select>'s string values via a lookup.
//
// The element exposes getValue() / setValue() / setDisabled() and dispatches a
// bubbling 'change' (plus an optional onChange) whenever the value changes.
//
//   createNumericSelect({ presets: [{ value: null, label: 'No limit' }, 15, 20], min: 1, max: 100, value: null })

import './numeric-select.css';

const CUSTOM = '__custom__';

export function createNumericSelect({ presets = [], min = 0, max = 9999, value = min, onChange = null }) {
    const list = presets.map((p) => (typeof p === 'object' ? p : { value: p, label: String(p) }));
    const presetValues = list.map((p) => p.value);
    // Map a preset's stringified value back to its real value, so non-numeric
    // presets (e.g. null for "No limit") survive the <select>'s string values.
    const valueByKey = {};
    for (const p of list) {
        valueByKey[String(p.value)] = p.value;
    }
    const clamp = (v) => Math.max(min, Math.min(max, v));
    // Presets are valid as-is; only free-text custom input is bounded.
    const normalize = (v) => (presetValues.includes(v) ? v : clamp(Number(v)));

    let current = normalize(value);
    let editing = false;
    let disabled = false;

    const el = document.createElement('div');
    el.className = 'numeric-select';

    function fire() {
        if (onChange) {
            onChange(current);
        }
        el.dispatchEvent(new Event('change', { bubbles: true }));
    }

    function buildSelect() {
        const select = document.createElement('select');
        for (const p of list) {
            const opt = document.createElement('option');
            opt.value = String(p.value);
            opt.textContent = p.label;
            select.appendChild(opt);
        }
        // A committed custom value (a number not among the presets) shows as its
        // own selected option, so the dropdown reflects the current setting.
        const isCustom = !presetValues.includes(current);
        if (isCustom) {
            const opt = document.createElement('option');
            opt.value = String(current);
            opt.textContent = String(current);
            select.appendChild(opt);
        }
        const customOpt = document.createElement('option');
        customOpt.value = CUSTOM;
        customOpt.textContent = 'Custom…';
        select.appendChild(customOpt);

        select.value = String(current);
        select.addEventListener('change', () => {
            if (select.value === CUSTOM) {
                editing = true;
                render();
            } else if (select.value in valueByKey) {
                current = valueByKey[select.value]; // a preset (may be null)
                fire();
            } else {
                current = Number(select.value); // a committed custom value
                fire();
            }
        });
        return select;
    }

    function buildEditor() {
        const input = document.createElement('input');
        input.type = 'number';
        input.className = 'numeric-select-input';
        input.min = String(min);
        input.max = String(max);
        // Seed from the current number, or the minimum when leaving a non-numeric
        // preset like "No limit".
        input.value = String(Number.isFinite(current) ? current : min);

        function commit() {
            const v = parseInt(input.value, 10);
            current = Number.isFinite(v) ? clamp(v) : current;
            editing = false;
            render();
            fire();
        }
        function cancel() {
            editing = false;
            render();
        }
        input.addEventListener('keydown', (e) => {
            if (e.key === 'Enter') {
                e.preventDefault();
                commit();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });

        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'btn btn-icon btn-primary';
        okBtn.textContent = '✓';
        okBtn.addEventListener('click', commit);

        const cancelBtn = document.createElement('button');
        cancelBtn.type = 'button';
        cancelBtn.className = 'btn btn-icon btn-danger';
        cancelBtn.textContent = '✕';
        cancelBtn.addEventListener('click', cancel);

        setTimeout(() => {
            input.focus();
            input.select();
        }, 0);
        return [input, okBtn, cancelBtn];
    }

    function render() {
        el.innerHTML = '';
        if (editing) {
            el.append(...buildEditor());
        } else {
            el.appendChild(buildSelect());
        }
        el.querySelectorAll('select, input, button').forEach((elem) => {
            elem.disabled = disabled;
        });
    }

    el.getValue = () => current;
    el.setValue = (v) => {
        current = normalize(v);
        editing = false;
        render();
    };
    el.setDisabled = (d) => {
        disabled = d;
        render();
    };

    render();
    return el;
}
