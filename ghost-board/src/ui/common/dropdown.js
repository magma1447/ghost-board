// Shared dropdown open/close behavior — one home for the pattern the settings
// menu, connection control, and rematch menu all follow: the anchor click
// toggles the menu; while open, a capture-phase document click (anything
// outside the wrap) or Escape closes it, and closing always unregisters both
// listeners so nothing leaks.
export function attachDropdown(wrapEl, anchorEl, menuEl, { onOpen, onClose } = {}) {
    function onDocClick(e) {
        if (!wrapEl.contains(e.target)) {
            close();
        }
    }
    function onKeyDown(e) {
        if (e.key === 'Escape') {
            close();
        }
    }
    function open() {
        if (onOpen) {
            onOpen();
        }
        menuEl.hidden = false;
        document.addEventListener('click', onDocClick, true);
        document.addEventListener('keydown', onKeyDown);
    }
    function close() {
        menuEl.hidden = true;
        document.removeEventListener('click', onDocClick, true);
        document.removeEventListener('keydown', onKeyDown);
        if (onClose) {
            onClose();
        }
    }
    anchorEl.addEventListener('click', (e) => {
        e.stopPropagation();
        if (menuEl.hidden) {
            open();
        } else {
            close();
        }
    });
    return { open, close };
}
