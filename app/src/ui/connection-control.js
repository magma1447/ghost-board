// Bluetooth connection control — a status-colored icon that opens a small
// dropdown with the current connection detail and a single context-aware
// action (Connect / Disconnect / Connecting…). Reuses the floating-menu
// styling (.menu / .menu-anchor). Connection failures raise a toast so they
// surface even when the dropdown is closed.

import './connection-control.css';
import { showToast } from './common/toast.js';
import { icons } from './common/icons.js';
import { attachDropdown } from './common/dropdown.js';

export function createConnectionControl({ onConnect, onDisconnect }) {
    const wrap = document.createElement('div');
    wrap.className = 'menu-anchor';

    const btn = document.createElement('button');
    btn.className = 'btn btn-icon conn-btn';
    btn.innerHTML = icons.bluetooth;
    btn.dataset.status = 'disconnected';

    const dropdown = document.createElement('div');
    dropdown.className = 'menu conn-menu';
    dropdown.hidden = true;

    const statusLine = document.createElement('div');
    statusLine.className = 'conn-status';

    const actionBtn = document.createElement('button');
    actionBtn.className = 'conn-action';

    // Action on top, status message below a divider
    dropdown.append(actionBtn, statusLine);
    wrap.append(btn, dropdown);

    let current = 'disconnected';

    function setStatus(status, detail) {
        current = status;
        btn.dataset.status = status;
        btn.title = detail || status;
        statusLine.textContent = `Status: ${detail || status}`;

        if (status === 'connected') {
            actionBtn.textContent = 'Disconnect';
            actionBtn.disabled = false;
        } else if (status === 'connecting' || status === 'scanning') {
            actionBtn.textContent = 'Connecting…';
            actionBtn.disabled = true;
        } else {
            actionBtn.textContent = 'Connect';
            actionBtn.disabled = false;
        }

        // Surface failures even when the dropdown is closed
        if (status === 'error') {
            showToast(detail || 'Connection error', 'error');
        }
    }

    const menu = attachDropdown(wrap, btn, dropdown);

    actionBtn.addEventListener('click', () => {
        if (current === 'connected') {
            onDisconnect();
        } else if (current !== 'connecting' && current !== 'scanning') {
            onConnect();
        }
        menu.close();
    });

    setStatus('disconnected', 'Disconnected');

    return { element: wrap, setStatus };
}
