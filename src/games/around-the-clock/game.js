// Around the Clock — hit 1 through 20 (optionally bull) in order.
//
// Each player must hit their current target number to advance. Only the
// current target counts — hitting any other number is a miss. Multiple
// sequential hits in one turn all count (e.g. if target is 5 and you
// hit S5, S6, S7 → you advance to 8; but S5, S7, S6 → only S5 counts).
//
// Targets are internally numbered 1–21 where 21 represents bull.
// No bust mechanic — wrong darts are simply misses (plays bust sound).
//
// Options:
//   hitMode: 'any' | 'doubles' | 'triples' — which ring counts as a hit
//   multiStep: doubles advance 2 targets, triples advance 3
//   bullFinish: 'off' (end at 20) | 'single' | 'double' (must finish on bull)

export function createAroundTheClock({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    bullFinish = 'single',
    hitMode = 'any',
    multiStep = false,
    maxRounds = 0,
} = {}) {
    const finalTarget = bullFinish === 'off' ? 20 : 21; // 21 = bull

    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], currentTarget: 1, lastDarts: [] });
    }

    const state = {
        type: 'around-the-clock',
        bullFinish,
        hitMode,
        multiStep,
        maxRounds,
        finalTarget,
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
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        if (state.currentPlayerIndex === 0) {
            state.round++;
        }

        if (maxRounds > 0 && state.round > maxRounds) {
            state.gameOver = true;
            state.winner = null;
            return 'draw';
        }
        return null;
    }

    // Convert internal target number to a speakable value for voice callouts.
    // Targets 1–20 are spoken as-is; target 21 (bull) is spoken as 25 or 50.
    function formatTarget(target) {
        if (target <= 20) {
            return target;
        }
        return bullFinish === 'double' ? 50 : 25;
    }

    // Check if the dart's ring qualifies as a hit for the given target.
    // Bull has special handling: no triple ring exists, so triples mode accepts any bull.
    function ringMatches(ring, target) {
        if (target === 21) {
            if (bullFinish === 'double') {
                return ring === 'DBULL';
            }
            // Single bull finish — accept either
            return ring === 'SBULL' || ring === 'DBULL';
        }

        // Number targets — check hit mode
        if (hitMode === 'doubles') {
            return ring === 'D';
        }
        if (hitMode === 'triples') {
            return ring === 'T';
        }
        // Any ring on the correct segment
        return ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T';
    }

    function segmentMatches(segment, target) {
        if (target === 21) {
            // Bull — segment check is handled by ringMatches
            return true;
        }
        return segment === target;
    }

    // With multi-step enabled, doubles advance 2 targets and triples advance 3.
    // E.g. target is 5, hit T5 → advance to 8 (skipping 6 and 7).
    function stepsForRing(ring) {
        if (!multiStep) {
            return 1;
        }
        if (ring === 'D' || ring === 'DBULL') {
            return 2;
        }
        if (ring === 'T') {
            return 3;
        }
        return 1;
    }

    function nextPlayer() {
        const callouts = [];
        const drawEvent = advancePlayer();

        if (!state.gameOver) {
            callouts.push({ type: 'remaining', value: formatTarget(currentPlayer().currentTarget) });
        }

        return { state, event: drawEvent || 'switch', callouts };
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
        const target = player.currentTarget;

        // Check if this dart hits the current target
        const isHit = segmentMatches(segment, target) && ringMatches(ring, target);

        if (!isHit) {
            state.turnDarts.push({ ring, segment, hit: false });
            return { state, event: 'miss', callouts: [] };
        }

        // Hit — advance target (capped at finalTarget + 1 to indicate completion)
        const steps = stepsForRing(ring);
        player.currentTarget = Math.min(player.currentTarget + steps, finalTarget + 1);
        state.turnDarts.push({ ring, segment, hit: true });

        // Check win
        if (player.currentTarget > finalTarget) {
            state.gameOver = true;
            state.winner = state.currentPlayerIndex;
            return { state, event: 'win', callouts: [] };
        }

        // Call out the next target (but not on last dart — switch will handle it)
        const callouts = [];
        if (state.turnDarts.length < dartsPerTurn) {
            callouts.push({ type: 'checkout', value: formatTarget(player.currentTarget) });
        }
        return { state, event: null, callouts };
    }

    function getCallouts() {
        if (state.gameOver) {
            return [];
        }
        return [{ type: 'remaining', value: formatTarget(currentPlayer().currentTarget) }];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
    }

    // Big heads-up number for the current player: their current target
    function getHeadline() {
        const target = currentPlayer().currentTarget;
        if (target > finalTarget) {
            return 'Done';
        }
        if (target === 21) {
            return 'Bull';
        }
        return String(target);
    }

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
