// Request Android's immersive full-screen (hides the status + navigation bars,
// like a game). Touch devices only — a desktop browser shouldn't be yanked
// fullscreen. Needs a user gesture, so call it from a tap/click handler; a
// silent no-op where unsupported or already fullscreen.

export function requestImmersiveFullscreen() {
    if (!window.matchMedia('(pointer: coarse)').matches) {
        return; // touch / mobile only
    }
    const el = document.documentElement;
    if (el.requestFullscreen && !document.fullscreenElement) {
        el.requestFullscreen().catch(() => {}); // rejected without a gesture / when blocked
    }
}

// Keep the app immersive across foregrounding. Full-screen needs a user gesture,
// and browsers drop it when the screen locks or the tab is backgrounded (#72),
// so we can't just re-request it on return. Instead we arm a one-shot pointer
// handler — the next tap restores full-screen — and re-arm it whenever the page
// comes back to the foreground having lost it. Touch-only via
// requestImmersiveFullscreen's own guard; a harmless no-op elsewhere.
export function keepImmersiveFullscreen() {
    let armed = false;
    const arm = () => {
        if (armed) {
            return; // one pending handler at a time
        }
        armed = true;
        window.addEventListener('pointerdown', () => {
            armed = false;
            requestImmersiveFullscreen();
        }, { once: true });
    };
    arm(); // covers a reload straight into the app (no landing Enter gesture)
    document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible' && !document.fullscreenElement) {
            arm(); // returned from lock / background and lost full-screen — re-arm
        }
    });
}
