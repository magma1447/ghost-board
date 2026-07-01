// Generic, global toast notifications.
//
// Fire-and-forget: showToast('message', 'error') drops a transient,
// auto-dismissing notice in a fixed corner. Click to dismiss early.
// Any module can call it — it's not tied to a particular feature.

let container = null;

function ensureContainer() {
    if (!container) {
        container = document.createElement('div');
        container.className = 'toast-container';
        document.body.appendChild(container);
    }
    return container;
}

// type: 'info' (default) | 'error' | 'success'
export function showToast(message, type = 'info', duration = 4000) {
    const host = ensureContainer();

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.textContent = message;
    host.appendChild(toast);

    // Enter transition on the next frame (after the node is laid out)
    requestAnimationFrame(() => toast.classList.add('toast-visible'));

    let dismissed = false;
    function dismiss() {
        if (dismissed) {
            return;
        }
        dismissed = true;
        toast.classList.remove('toast-visible');
        toast.addEventListener('transitionend', () => toast.remove(), { once: true });
        // Fallback in case the transition doesn't fire
        setTimeout(() => toast.remove(), 400);
    }

    setTimeout(dismiss, duration);
    toast.addEventListener('click', dismiss);
}
