// Cat and Mouse — mouse runs clockwise around the board, cat chases.
//
// Both players move around the 20 board segments in clockwise order.
// Mouse starts at segment 20 (index 0 in BOARD_ORDER), cat starts
// `gap` positions behind. Mouse wins by completing a full lap (reaching
// the cat's starting position). Cat wins by catching up to or passing
// the mouse.
//
// Progress is tracked as an absolute step counter (not a board position).
// The actual target segment is computed from progress using BOARD_ORDER.
// This avoids circular comparison complexity — win conditions are simple
// integer comparisons on progress values.

import { currentPlayer, ringMatchesMode, stepsForRing } from '../game-helpers.js';

// Standard dartboard clockwise order (physical layout, not numerical)
const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

export function createCatAndMouse({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    gap = 1,
    hitMode = 'any',
    multiStep = false,
    maxRounds = 0,
    roundLimitResult = 'mouse',
    sprint = false,
    startingPlayerIndex = 0,
} = {}) {
    // Map absolute progress to a board segment number.
    // Mouse starts at BOARD_ORDER[0] = 20, cat starts `gap` positions behind.
    // The cat's offset is (20 - gap) so with gap=1, cat starts at position 19
    // in the array (segment 5), which is one step behind 20 in clockwise order.
    function computeTarget(playerIndex, progress) {
        if (playerIndex === 0) {
            return BOARD_ORDER[progress % 20];
        }
        return BOARD_ORDER[((20 - gap) + progress) % 20];
    }

    // Always exactly 2 players. The human names come from the roster and are
    // shown alongside the role in the panel. In match play the roles swap each
    // leg (startingPlayerIndex rotates), so both players get equal time as the
    // mouse with its head start. The mouse always throws first.
    const mouseUuid = playerUuids[startingPlayerIndex % 2];
    const catUuid = playerUuids[(startingPlayerIndex + 1) % 2];
    const players = [
        { uuid: mouseUuid, role: 'Mouse', progress: 0, currentTarget: computeTarget(0, 0), lastDarts: [] },
        { uuid: catUuid, role: 'Cat', progress: 0, currentTarget: computeTarget(1, 0), lastDarts: [] },
    ];
    void numPlayers;

    const state = {
        type: 'cat-and-mouse',
        dartsPerTurn,
        gap,
        hitMode,
        multiStep,
        maxRounds,
        players,
        currentPlayerIndex: 0,
        turnDarts: [], // current set of 3 (reset on sprint) — gates turn-full logic
        turnDisplay: [], // all darts shown for the ongoing turn (accumulates across sprints)
        turnLocked: false,
        round: 1,
        gameOver: false,
        winner: null,
    };

    function advancePlayer() {
        currentPlayer(state).lastDarts = state.turnDisplay; // full turn, including sprint sets
        state.turnDarts = [];
        state.turnDisplay = [];
        state.turnLocked = false;
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % 2;
        if (state.currentPlayerIndex === 0) {
            state.round++;
        }

        if (maxRounds > 0 && state.round > maxRounds) {
            state.gameOver = true;
            if (roundLimitResult === 'draw') {
                state.winner = null;
                return 'draw';
            }
            // Default: the cat never caught the mouse (or the game would have
            // ended already), so the mouse escaped and wins.
            state.winner = 0;
            return 'win';
        }
        return null;
    }

    // Cat catches mouse when cat's progress lead equals or exceeds the gap.
    // Since cat starts `gap` positions behind, this means cat has physically
    // reached or passed the mouse on the board.
    function checkCatCaught() {
        return state.players[1].progress - state.players[0].progress >= gap;
    }

    // Mouse wins by completing a full lap (20 steps = all segments)
    function checkMouseFinished() {
        return state.players[0].progress >= 20;
    }

    function nextPlayer() {
        const callouts = [];
        const endEvent = advancePlayer(); // 'win' / 'draw' on round limit, else null

        if (!state.gameOver) {
            const player = currentPlayer(state);
            callouts.push({ type: 'remaining', value: player.currentTarget });
        }

        return { state, event: endEvent || 'switch', callouts };
    }

    function onDart(ring, segment) {
        // Dart didn't count (game over, or turn already complete/locked) —
        // 'ignored' lets the UI skip audio while LEDs still flash.
        if (state.gameOver) {
            return { state, event: 'ignored', callouts: [] };
        }
        if (state.turnLocked || state.turnDarts.length >= dartsPerTurn) {
            return { state, event: 'ignored', callouts: [] };
        }

        const player = currentPlayer(state);
        const idx = state.currentPlayerIndex;
        const target = player.currentTarget;

        // Check if dart hits current target
        const isHit = segment === target && ringMatchesMode(ring, hitMode);

        if (!isHit) {
            const dart = { ring, segment, hit: false };
            state.turnDarts.push(dart);
            state.turnDisplay.push(dart);
            return { state, event: 'miss', callouts: [] };
        }

        // Hit — advance
        const steps = stepsForRing(ring, multiStep);
        player.progress += steps;
        player.currentTarget = computeTarget(idx, player.progress);
        const dart = { ring, segment, hit: true };
        state.turnDarts.push(dart);
        state.turnDisplay.push(dart);

        // Check win conditions
        if (idx === 0 && checkMouseFinished()) {
            state.gameOver = true;
            state.winner = 0;
            return { state, event: 'win', callouts: [] };
        }
        if (idx === 1 && checkCatCaught()) {
            state.gameOver = true;
            state.winner = 1;
            return { state, event: 'win', callouts: [] };
        }

        // Sprint: a perfect set (all darts in the turn hit) earns another full
        // set — reset the darts so the same player keeps throwing.
        if (sprint && state.turnDarts.length >= dartsPerTurn && state.turnDarts.every((d) => d.hit)) {
            state.turnDarts = [];
            return { state, event: 'sprint', callouts: [] };
        }

        // Call out next target (not on last dart)
        const callouts = [];
        if (state.turnDarts.length < dartsPerTurn) {
            callouts.push({ type: 'checkout', value: player.currentTarget });
        }
        return { state, event: null, callouts };
    }

    function getCallouts() {
        if (state.gameOver) {
            return [];
        }
        return [{ type: 'remaining', value: currentPlayer(state).currentTarget }];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
    }

    // Big heads-up number for the current player: their current target
    function getHeadline() {
        return String(currentPlayer(state).currentTarget);
    }

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
