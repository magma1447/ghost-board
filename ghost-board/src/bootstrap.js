// App entry / router. `/` shows the landing; `#/app` (and any refresh there)
// boots the app. Keeping the heavy app (main.js) behind a dynamic import means
// the landing loads instantly and the app + BLE only start when you continue.
//
// Hash routing is used because the site is hosted statically (GitHub Pages), so
// there's no server to rewrite clean /app paths; the PWA start_url is /, which
// lands on the welcome screen out of the box.

function enterApp() {
    const landing = document.getElementById('landing');
    if (landing) {
        landing.remove();
    }
    if (location.hash !== '#/app') {
        location.hash = '#/app';
    }
    import('./main.js');
}

if (location.hash === '#/app') {
    import('./main.js');
} else {
    import('./landing/landing.js').then(({ renderLanding }) => renderLanding(enterApp));
}
