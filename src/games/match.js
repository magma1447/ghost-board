// Match layer: legs and sets above a single game.
//
// A single game instance is one *leg*. Best-of-N legs decide a *set*, and
// best-of-N sets decide the *match*. The starting player rotates each leg
// (carrying across set boundaries). This module is pure state logic — the
// game controller owns an instance and drives the UI from it.
//
// best-of N → first to floor(N/2)+1 (e.g. best of 5 → first to 3). Best-of-1
// means a single leg/set, i.e. the match layer is inactive.

export function firstToWin(bestOf) {
    return Math.floor(bestOf / 2) + 1;
}

export function createMatchState(legsBestOf, setsBestOf, playerUuids) {
    const numPlayers = playerUuids.length;
    return {
        legsBestOf,
        setsBestOf,
        playerUuids: [...playerUuids], // stable order for indexing legs/sets won
        numPlayers,
        legNumber: 1, // running count across the whole match (drives rotation)
        legsWon: new Array(numPlayers).fill(0), // within the current set
        setsWon: new Array(numPlayers).fill(0), // across the match
        legResults: [], // history: { set, winner } per completed leg
    };
}

// The match layer is only active when there's more than one leg or set to win.
export function isMatchPlay(match) {
    return !!match && (match.legsBestOf > 1 || match.setsBestOf > 1);
}

// Index of the player who throws first in the current leg (rotates each leg).
export function startingPlayerIndex(match) {
    return (match.legNumber - 1) % match.numPlayers;
}

// Record a completed leg. Mutates match and returns the outcome:
//   { level: 'leg' | 'set' | 'match', winnerIndex }
// 'set' means this leg also clinched the set (leg counts reset); 'match' means
// it clinched the match.
export function recordLegWin(match, winnerIndex) {
    // Log the leg against the set it belongs to (before the set tally changes)
    if (!match.legResults) {
        match.legResults = [];
    }
    match.legResults.push({ set: currentSetNumber(match), winner: winnerIndex });
    match.legsWon[winnerIndex]++;
    if (match.legsWon[winnerIndex] >= firstToWin(match.legsBestOf)) {
        match.setsWon[winnerIndex]++;
        match.legsWon = new Array(match.numPlayers).fill(0);
        if (match.setsWon[winnerIndex] >= firstToWin(match.setsBestOf)) {
            return { level: 'match', winnerIndex };
        }
        return { level: 'set', winnerIndex };
    }
    return { level: 'leg', winnerIndex };
}

// Advance to the next leg (after a leg/set win that doesn't end the match).
export function advanceLeg(match) {
    match.legNumber++;
}

// Current 1-based set number (across the match) and leg number (within the set),
// for display.
export function currentSetNumber(match) {
    return match.setsWon.reduce((a, b) => a + b, 0) + 1;
}

export function currentLegNumber(match) {
    return match.legsWon.reduce((a, b) => a + b, 0) + 1;
}

// "Set 2 | Leg 1" for set play, else just "Leg 1". Shown in front of the round.
// Uses a pipe (not /) so the slash stays reserved for "of" (Round 1 / 15).
export function matchPositionLabel(match) {
    if (match.setsBestOf > 1) {
        return `Set ${currentSetNumber(match)} | Leg ${currentLegNumber(match)}`;
    }
    return `Leg ${currentLegNumber(match)}`;
}

// Standings by sets, then legs in the current set. Returns an array of 1-based
// ranks (standard competition ranking — equal scores share a rank, the next
// rank skips), or null when everyone is level (no ranking worth showing).
// Example: scores [2,1,1,0] → ranks [1,2,2,4].
export function matchRanks(match) {
    const scores = [];
    for (let i = 0; i < match.numPlayers; i++) {
        scores.push(match.setsWon[i] * 1000 + match.legsWon[i]); // sets dominate
    }
    if (scores.every((s) => s === scores[0])) {
        return null; // everyone level — nothing to rank
    }
    return scores.map((s) => 1 + scores.filter((other) => other > s).length);
}

// Per-player legs/sets tally for the scoreboard row, e.g. "1 set, 2 legs".
// Only includes the dimensions in play. Empty string for unknown players.
export function playerMatchLabel(match, uuid) {
    const i = match.playerUuids ? match.playerUuids.indexOf(uuid) : -1;
    if (i < 0) {
        return '';
    }
    // Sets before legs, matching the header and competition convention.
    const parts = [];
    if (match.setsBestOf > 1) {
        parts.push(`${match.setsWon[i]} ${match.setsWon[i] === 1 ? 'set' : 'sets'}`);
    }
    if (match.legsBestOf > 1) {
        parts.push(`${match.legsWon[i]} ${match.legsWon[i] === 1 ? 'leg' : 'legs'}`);
    }
    return parts.join(', ');
}
