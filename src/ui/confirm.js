// Generic confirmation dialog — a centered modal with a message and
// Cancel / Confirm buttons. Calls onConfirm only if the user confirms.
// Cancel is focused by default (safer for destructive actions); Escape or
// a backdrop click also cancels.

export function confirmDialog({ message, confirmLabel = 'Confirm', onConfirm }) {
    const backdrop = document.createElement('div');
    backdrop.className = 'confirm-backdrop';

    const dialog = document.createElement('div');
    dialog.className = 'confirm-dialog';

    const msg = document.createElement('div');
    msg.className = 'confirm-message';
    msg.textContent = message;

    const buttons = document.createElement('div');
    buttons.className = 'confirm-buttons';

    const cancelBtn = document.createElement('button');
    cancelBtn.className = 'btn';
    cancelBtn.textContent = 'Cancel';

    const confirmBtn = document.createElement('button');
    confirmBtn.className = 'btn btn-danger';
    confirmBtn.textContent = confirmLabel;

    buttons.append(cancelBtn, confirmBtn);
    dialog.append(msg, buttons);
    backdrop.appendChild(dialog);
    document.body.appendChild(backdrop);

    function close() {
        document.removeEventListener('keydown', onKey);
        backdrop.remove();
    }

    function onKey(e) {
        if (e.key === 'Escape') {
            close();
        }
    }

    cancelBtn.addEventListener('click', close);
    confirmBtn.addEventListener('click', () => {
        close();
        onConfirm();
    });
    backdrop.addEventListener('click', (e) => {
        if (e.target === backdrop) {
            close();
        }
    });
    document.addEventListener('keydown', onKey);

    cancelBtn.focus();
}
