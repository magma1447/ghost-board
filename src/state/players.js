// Local player registry — persistent store of players, keyed by UUID.
//
// Players are objects { uuid, name } saved in settings under `players`.
// Richer fields (avatar, handedness, stats…) can be added later without
// changing callers. A separate `lastPlayers` list (UUIDs) remembers the
// last-used selection so the setup roster can pre-fill it.

import { settings, updateSettings } from './settings.js';

// Max characters in a player name. Bump as needed.
export const MAX_NAME_LENGTH = 16;

// Characters NOT allowed in player names — everything else is stripped.
// Allowed: letters (incl. accented/Unicode), digits, space, and - _ ' .
// Extend the allowed set by editing this pattern.
const DISALLOWED_CHARS = /[^\p{L}\p{N} _'.\-]/gu;

export function sanitizeName(value) {
    return value.replace(DISALLOWED_CHARS, '').slice(0, MAX_NAME_LENGTH);
}

export function getPlayers() {
    const stored = settings().players;
    return Array.isArray(stored) ? stored : [];
}

// A lightweight reference to a player by UUID. Games store the UUID in their
// (serializable) state and use this to resolve the current name for display.
// Resolving live means renames reflect immediately; it's also where future
// per-player data (stats, etc.) will hang off. Returns 'Unknown' if the player
// was deleted from the registry.
export function createPlayer(uuid) {
    return {
        uuid,
        getName() {
            const player = getPlayers().find((p) => p.uuid === uuid);
            return player ? player.name : 'Unknown';
        },
    };
}

// True if a player with this name already exists (case-insensitive, trimmed),
// optionally excluding one UUID — used when renaming so a player doesn't
// collide with itself. Names must be unique since the UUID isn't user-visible.
export function nameExists(name, exceptUuid = null) {
    const key = sanitizeName(name).trim().toLowerCase();
    if (!key) {
        return false;
    }
    return getPlayers().some(
        (p) => p.uuid !== exceptUuid && p.name.toLowerCase() === key,
    );
}

// Adds a player; returns the new player, or null if the name is blank or taken.
export function addPlayer(name) {
    const clean = sanitizeName(name).trim();
    if (!clean || nameExists(clean)) {
        return null;
    }
    const players = getPlayers();
    const player = { uuid: crypto.randomUUID(), name: clean };
    players.push(player);
    updateSettings('players', players);
    return player;
}

// Renames a player; returns true on success, false if blank or name is taken.
export function renamePlayer(uuid, name) {
    const clean = sanitizeName(name).trim();
    if (!clean || nameExists(clean, uuid)) {
        return false;
    }
    const players = getPlayers();
    const player = players.find((p) => p.uuid === uuid);
    if (!player) {
        return false;
    }
    player.name = clean;
    updateSettings('players', players);
    return true;
}

export function deletePlayer(uuid) {
    const players = getPlayers().filter((p) => p.uuid !== uuid);
    updateSettings('players', players);
}

// Last-used selection (array of UUIDs), for pre-filling the setup roster.
export function getLastPlayers() {
    const stored = settings().lastPlayers;
    return Array.isArray(stored) ? stored : [];
}

export function setLastPlayers(uuids) {
    updateSettings('lastPlayers', uuids);
}
