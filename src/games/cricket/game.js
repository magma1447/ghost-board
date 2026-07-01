// Cricket — close the seven target numbers (three marks each), then score on
// your closed numbers. Standard: you keep the points, highest wins. Cut-throat:
// your points go to opponents who haven't closed the number, lowest wins.
// Simple: no scoring, first to close all wins.
//
// Numbers: 15–20 + bull by default, or six random segments (1–20) + bull in the
// Random variant. Marks: single = 1, double = 2, treble = 3; outer bull = 1,
// inner bull = 2. A number is closed at 3 marks; extra marks score its value
// (bull = 25) while at least one opponent still hasn't closed it (a number
// closed by everyone is dead). Solo play scores freely.
//
// Returns { state, event, callouts } from onDart() and nextPlayer().
// Events: null (mark / score), 'miss', 'win', 'switch', 'ignored'

import { currentPlayer } from '../game-helpers.js';

const STANDARD_NUMBERS = [20, 19, 18, 17, 16, 15];

// `count` unique random segments (1–20), high → low, for Random Cricket.
function randomNumbers(count) {
    const pool = [];
    for (let i = 1; i <= 20; i++) {
        pool.push(i);
    }
    const picked = [];
    for (let k = 0; k < count; k++) {
        picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picked.sort((a, b) => b - a);
}

// The seven target numbers: 15–20 + bull, six random + bull, or seven random.
function buildNumbers(mode) {
    if (mode === 'randomBull') {
        return [...randomNumbers(6), 'bull'];
    }
    if (mode === 'randomNoBull') {
        return randomNumbers(7);
    }
    return [...STANDARD_NUMBERS, 'bull'];
}

// Which target number a dart hit and how many marks, or null if off-target.
function dartMarks(ring, segment, numbers) {
    if (ring === 'SBULL') {
        return { number: 'bull', marks: 1 };
    }
    if (ring === 'DBULL') {
        return { number: 'bull', marks: 2 };
    }
    if ((ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T') && numbers.includes(segment)) {
        return { number: segment, marks: ring === 'T' ? 3 : ring === 'D' ? 2 : 1 };
    }
    return null;
}

function numberValue(number) {
    return number === 'bull' ? 25 : number;
}

export function createCricket({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    variant = 'standard',
    numberSet = 'standard',
    startingPlayerIndex = 0,
} = {}) {
    const numbers = buildNumbers(numberSet);

    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        const marks = {};
        for (const n of numbers) {
            marks[n] = 0;
        }
        players.push({ uuid: playerUuids[i], marks, score: 0, lastDarts: [] });
    }

    const state = {
        type: 'cricket',
        dartsPerTurn,
        options: { variant, numberSet },
        numbers,
        players,
        currentPlayerIndex: startingPlayerIndex, // rotates each leg in match play
        turn: { darts: [], locked: false },
        round: 1,
        isGameOver: false,
        winner: null,
        targetSegments: [],
    };

    const isClosed = (p, n) => p.marks[n] >= 3;
    // Read state.numbers (not the construction-time array) so a restored game —
    // e.g. a Random set from before a reload — uses the right targets.
    const allClosed = (p) => state.numbers.every((n) => isClosed(p, n));

    // Numbers the current player still needs to close, for the LED ring (bull
    // has no ring LED, so it's excluded).
    function refreshTargets() {
        const p = currentPlayer(state);
        state.targetSegments = state.numbers.filter((n) => n !== 'bull' && !isClosed(p, n));
    }

    // A player wins by closing every number and, among those who've closed out,
    // holding the best score (highest for standard, lowest for cut-throat). Solo
    // play wins on closing out alone. Checks the thrower first, but any closed-out
    // player can win — cut-throat lets you win passively as opponents' scores rise.
    function findWinner(throwerIdx) {
        const order = [throwerIdx, ...players.map((_, i) => i).filter((i) => i !== throwerIdx)];
        for (const i of order) {
            const p = players[i];
            if (!allClosed(p)) {
                continue;
            }
            if (players.length === 1) {
                return i;
            }
            if (variant === 'simple') {
                return i; // no scoring — first to close all wins
            }
            const wins = players.every((o, j) => j === i
                || (variant === 'cutthroat' ? p.score <= o.score : p.score >= o.score));
            if (wins) {
                return i;
            }
        }
        return null;
    }

    function onDart(ring, segment) {
        // Dart didn't count (game over, or turn already complete/locked) —
        // 'ignored' lets the UI skip audio while LEDs still flash.
        if (state.isGameOver) {
            return { state, event: 'ignored', callouts: [] };
        }
        if (state.turn.locked || state.turn.darts.length >= dartsPerTurn) {
            return { state, event: 'ignored', callouts: [] };
        }

        const idx = state.currentPlayerIndex;
        const player = players[idx];
        const hit = dartMarks(ring, segment, state.numbers);

        // Not a target number → nothing happens
        if (!hit) {
            state.turn.darts.push({ ring, segment, hit: false, points: 0 });
            return { state, event: 'miss', callouts: [] };
        }

        const { number, marks } = hit;
        const value = numberValue(number);
        const before = player.marks[number];
        const toClose = Math.min(marks, 3 - before); // marks that close the number
        player.marks[number] = before + toClose;
        const overflow = marks - toClose; // marks beyond closing → scoring

        let points = 0;
        if (overflow > 0 && variant !== 'simple') {
            if (variant === 'cutthroat') {
                // Points go to every opponent who hasn't closed this number
                for (let j = 0; j < players.length; j++) {
                    if (j !== idx && !isClosed(players[j], number)) {
                        players[j].score += overflow * value;
                        points += overflow * value;
                    }
                }
            } else {
                // Standard: you score while any opponent is still open (solo: always)
                const anyOpen = players.some((o, j) => j !== idx && !isClosed(o, number));
                if (players.length === 1 || anyOpen) {
                    points = overflow * value;
                    player.score += points;
                }
            }
        }

        state.turn.darts.push({ ring, segment, hit: true, number, marks, points });
        refreshTargets();

        const winner = findWinner(idx);
        if (winner !== null) {
            player.lastDarts = state.turn.darts.slice();
            state.isGameOver = true;
            state.winner = winner;
            return { state, event: 'win', callouts: [] };
        }

        return { state, event: null, callouts: [] };
    }

    function nextPlayer() {
        currentPlayer(state).lastDarts = state.turn.darts; // keep visible until their next turn
        state.turn.darts = [];
        state.turn.locked = false;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        if (state.currentPlayerIndex === 0) {
            state.round++;
        }
        refreshTargets();
        return { state, event: 'switch', callouts: [] };
    }

    function getCallouts() {
        return [];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
    }

    // Big heads-up number for the current player: points, or the count of
    // closed numbers in the no-score Simple variant.
    function getHeadline() {
        const p = currentPlayer(state);
        if (variant === 'simple') {
            return String(state.numbers.filter((n) => isClosed(p, n)).length);
        }
        return String(p.score);
    }

    refreshTargets();

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
