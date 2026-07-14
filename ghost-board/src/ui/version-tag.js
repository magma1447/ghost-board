// The discreet build-version footnote (bottom-right), shared by the app and the
// landing so they stay in step. Reads the virtual:app-version build constant
// (a string — not the heavy app).

import './version-tag.css';
import APP_VERSION from 'virtual:app-version';

export function createVersionTag() {
    const el = document.createElement('div');
    el.className = 'version-tag';
    el.textContent = APP_VERSION;
    return el;
}
