// Floating tree menu component

import './menu.css';
import { attachDropdown } from './dropdown.js';

export function createMenu(anchorEl, tree) {
    const el = document.createElement('div');
    el.className = 'menu';
    el.hidden = true;

    for (const group of tree) {
        const groupEl = document.createElement('div');
        groupEl.className = 'menu-group';

        const header = document.createElement('button');
        header.className = 'menu-group-header';
        header.innerHTML = `<span class="menu-chevron">&#9656;</span> ${group.label}`;

        const body = document.createElement('div');
        body.className = 'menu-group-body';
        body.hidden = true;

        header.addEventListener('click', () => {
            const open = !body.hidden;
            body.hidden = open;
            header.classList.toggle('expanded', !open);
        });

        for (const item of group.children) {
            body.appendChild(renderItem(item));
        }

        groupEl.append(header, body);
        el.appendChild(groupEl);
    }

    // Wrap anchor in a positioned container so the menu floats outside the button
    const wrap = document.createElement('div');
    wrap.className = 'menu-anchor';
    anchorEl.parentNode.insertBefore(wrap, anchorEl);
    wrap.appendChild(anchorEl);
    wrap.appendChild(el);

    // Collapse all groups on close
    function collapseGroups() {
        el.querySelectorAll('.menu-group-body').forEach((b) => {
            b.hidden = true;
        });
        el.querySelectorAll('.menu-group-header').forEach((h) => {
            h.classList.remove('expanded');
        });
    }

    // The anchor click toggles; outside click / Escape close (attachDropdown).
    return attachDropdown(wrap, anchorEl, el, { onClose: collapseGroups });
}

function renderItem(item) {
    const row = document.createElement('div');
    row.className = 'menu-item';

    const label = document.createElement('label');
    label.textContent = item.label;
    row.appendChild(label);

    if (item.type === 'select') {
        const select = document.createElement('select');
        select.className = 'menu-select';
        for (const opt of item.options) {
            const o = document.createElement('option');
            o.value = opt;
            o.textContent = opt;
            select.appendChild(o);
        }
        select.value = item.value;
        select.addEventListener('change', () => item.onChange(select.value));
        row.appendChild(select);
        // Allow caller to keep a reference for dynamic updates
        if (item.onRender) {
            item.onRender(select);
        }
    } else if (item.type === 'toggle') {
        const cb = document.createElement('input');
        cb.type = 'checkbox';
        cb.className = 'menu-toggle';
        cb.checked = item.value;
        cb.addEventListener('change', () => item.onChange(cb.checked));
        row.appendChild(cb);
    } else if (item.type === 'range') {
        const wrap = document.createElement('div');
        wrap.className = 'menu-range';
        const input = document.createElement('input');
        input.type = 'range';
        input.min = item.min;
        input.max = item.max;
        input.step = item.step || 1;
        input.value = item.value;
        const value = document.createElement('span');
        value.className = 'menu-range-value';
        const fmt = item.format || ((v) => v);
        value.textContent = fmt(item.value);
        input.addEventListener('input', () => {
            value.textContent = fmt(input.value);
            item.onChange(Number(input.value));
        });
        wrap.append(input, value);
        row.appendChild(wrap);
    }

    return row;
}
