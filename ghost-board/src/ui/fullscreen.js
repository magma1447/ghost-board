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
