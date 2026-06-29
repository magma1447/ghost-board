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

    // Always exactly 2 players. The Mouse/Cat roles are fixed; the human
    // names come from the roster and are shown alongside the role in the panel.
    const players = [
        { uuid: playerUuids[0], role: 'Mouse', progress: 0, currentTarget: computeTarget(0, 0), lastDarts: [] },
        { uuid: playerUuids[1], role: 'Cat', progress: 0, currentTarget: computeTarget(1, 0), lastDarts: [] },
    ];
    void numPlayers;

    const state = {
        type: 'cat-and-mouse',
        gap,
        hitMode,
        multiStep,
        maxRounds,
        players,
        currentPlayerIndex: 0,
        turnDarts: [],
        turnLocked: false,
        round: 1,
        gameOver: false,
        winner: null,
    };

    function currentPlayer() {
        return state.players[state.currentPlayerIndex];
    }

    function advancePlayer() {
        currentPlayer().lastDarts = state.turnDarts; // keep this turn visible until their next
        state.turnDarts = [];
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

    function ringMatches(ring) {
        if (hitMode === 'doubles') {
            return ring === 'D';
        }
        if (hitMode === 'triples') {
            return ring === 'T';
        }
        return ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T';
    }

    function stepsForRing(ring) {
        if (!multiStep) {
            return 1;
        }
        if (ring === 'D') {
            return 2;
        }
        if (ring === 'T') {
            return 3;
        }
        return 1;
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
            const player = currentPlayer();
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

        const player = currentPlayer();
        const idx = state.currentPlayerIndex;
        const target = player.currentTarget;

        // Check if dart hits current target
        const isHit = segment === target && ringMatches(ring);

        if (!isHit) {
            state.turnDarts.push({ ring, segment, hit: false });
            return { state, event: 'miss', callouts: [] };
        }

        // Hit — advance
        const steps = stepsForRing(ring);
        player.progress += steps;
        player.currentTarget = computeTarget(idx, player.progress);
        state.turnDarts.push({ ring, segment, hit: true });

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
        return [{ type: 'remaining', value: currentPlayer().currentTarget }];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
    }

    // Big heads-up number for the current player: their current target
    function getHeadline() {
        return String(currentPlayer().currentTarget);
    }

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
