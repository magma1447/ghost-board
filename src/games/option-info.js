// Adds a "?" info button to each setup option row that has a description,
// revealing the option's one-liner in a click popover. Shared by game setups.

import { showPopover } from '../ui/popover.js';

export function attachOptionInfo(el, descriptions) {
    el.querySelectorAll('.game-setup-row').forEach((row) => {
        const control = row.querySelector('[data-field]');
        if (!control) {
            return;
        }
        const desc = descriptions[control.dataset.field];
        if (!desc) {
            return;
        }
        const info = document.createElement('button');
        info.type = 'button';
        info.className = 'game-option-info';
        info.textContent = '?';
        info.title = 'What\'s this?';
        info.addEventListener('click', (e) => {
            e.stopPropagation();
            showPopover(info, desc);
        });
        row.appendChild(info);
    });
}
