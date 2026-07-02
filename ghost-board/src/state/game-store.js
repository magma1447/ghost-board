// Game state persistence via localStorage

const STORAGE_KEY = 'ghost-board-game';

export function saveGame(data) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
    } catch {
    // Storage full or unavailable — non-critical
    }
}

export function loadGame() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : null;
    } catch {
        return null;
    }
}

export function clearGame() {
    localStorage.removeItem(STORAGE_KEY);
}
