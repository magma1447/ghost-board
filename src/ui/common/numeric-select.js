// Reusable numeric option control, modelled on the player roster's select:
// a dropdown of preset values plus a "Custom…" option that swaps the control
// to an inline integer input (✓ / ✕, Enter / Escape), bounded by [min, max].
// A committed custom value reappears in the dropdown as its own option.
//
// The element exposes getValue() / setValue() and dispatches a bubbling
// 'change' (plus an optional onChange) whenever the value changes.
//
//   createNumericSelect({ presets: [8], min: 1, max: 99, value: 8 })
//   presets are numbers, or { value, label } for a labelled option.

const CUSTOM = '__custom__';

export function createNumericSelect({ presets = [], min = 0, max = 9999, value = min, onChange = null }) {
    const list = presets.map((p) => (typeof p === 'object' ? p : { value: p, label: String(p) }));
    const presetValues = list.map((p) => p.value);
    const clamp = (v) => Math.max(min, Math.min(max, v));

    let current = clamp(Number(value));
    let editing = false;

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
        // A committed custom value (not among the presets) shows as its own
        // selected option, so the dropdown reflects the current setting.
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
            } else {
                current = Number(select.value);
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
        input.value = String(current);

        function confirm() {
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
                confirm();
            } else if (e.key === 'Escape') {
                e.preventDefault();
                cancel();
            }
        });

        const okBtn = document.createElement('button');
        okBtn.type = 'button';
        okBtn.className = 'btn btn-icon btn-primary';
        okBtn.textContent = '✓';
        okBtn.addEventListener('click', confirm);

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
    }

    el.getValue = () => current;
    el.setValue = (v) => {
        current = clamp(Number(v));
        editing = false;
        render();
    };

    render();
    return el;
}
