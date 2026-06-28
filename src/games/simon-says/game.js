// Simon Says — each round, Simon picks 3 unique target numbers (1–20).
// Both players throw at the same 3 targets, hittable in any order.
// After all players throw, a new round begins with fresh targets.
// Most points after N rounds wins.
//
// Scoring modes:
//   'flat'       — 1 point per hit (max 3 per round)
//   'staggered'  — 1st hit = 1pt, 2nd = 2pt, 3rd = 3pt (max 6 per round)
//
// The targetsHit array tracks which of the 3 targets have been hit this
// turn. targetSegments lists the remaining unhit segment numbers for LED
// display (main.js reads this to light up multiple segments).

export function createSimonSays({
    numPlayers = 2,
    dartsPerTurn = 3,
    hitMode = 'any',
    scoring = 'flat',
    maxRounds = 10,
} = {}) {
    function generateSequence() {
        // Pick 3 unique numbers from 1–20
        const pool = [];
        for (let i = 1; i <= 20; i++) {
            pool.push(i);
        }
        const seq = [];
        for (let i = 0; i < dartsPerTurn; i++) {
            const idx = Math.floor(Math.random() * pool.length);
            seq.push(pool[idx]);
            pool.splice(idx, 1);
        }
        return seq;
    }

    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ name: `Player ${i + 1}`, score: 0 });
    }

    const state = {
        type: 'simon-says',
        hitMode,
        scoring,
        maxRounds,
        sequence: generateSequence(),
        targetsHit: [false, false, false],
        targetSegments: [],
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

    function ringMatches(ring) {
        if (hitMode === 'doubles') {
            return ring === 'D';
        }
        if (hitMode === 'triples') {
            return ring === 'T';
        }
        return ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T';
    }

    // Rebuild targetSegments from sequence and targetsHit
    function updateTargetSegments() {
        state.targetSegments = [];
        for (let i = 0; i < state.sequence.length; i++) {
            if (!state.targetsHit[i]) {
                state.targetSegments.push(state.sequence[i]);
            }
        }
    }

    function determineWinner() {
        let best = -1;
        let bestIdx = null;
        let tie = false;
        for (let i = 0; i < state.players.length; i++) {
            if (state.players[i].score > best) {
                best = state.players[i].score;
                bestIdx = i;
                tie = false;
            } else if (state.players[i].score === best) {
                tie = true;
            }
        }
        return tie ? null : bestIdx;
    }

    function onDart(ring, segment) {
        if (state.gameOver) {
            return { state, event: null, callouts: [] };
        }
        if (state.turnLocked || state.turnDarts.length >= dartsPerTurn) {
            return { state, event: null, callouts: [] };
        }

        // Check if dart hits any remaining (unhit) target
        let hitIndex = -1;
        for (let i = 0; i < state.sequence.length; i++) {
            if (!state.targetsHit[i] && segment === state.sequence[i] && ringMatches(ring)) {
                hitIndex = i;
                break;
            }
        }

        const isHit = hitIndex >= 0;
        if (isHit) {
            state.targetsHit[hitIndex] = true;
            // Staggered: 1st hit = 1pt, 2nd = 2pt, 3rd = 3pt
            const hitsThisTurn = state.targetsHit.filter(Boolean).length;
            currentPlayer().score += scoring === 'staggered' ? hitsThisTurn : 1;
        }

        state.turnDarts.push({ ring, segment, hit: isHit });
        updateTargetSegments();

        return { state, event: isHit ? null : 'miss', callouts: [] };
    }

    function nextPlayer() {
        state.turnDarts = [];
        state.turnLocked = false;
        state.targetsHit = [false, false, false];
        state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;

        if (state.currentPlayerIndex === 0) {
            // All players completed this round — advance
            state.round++;

            if (state.maxRounds > 0 && state.round > state.maxRounds) {
                state.gameOver = true;
                state.targetSegments = [];
                state.winner = determineWinner();
                const event = state.winner !== null ? 'win' : 'draw';
                return { state, event, callouts: [] };
            }

            state.sequence = generateSequence();
        }

        updateTargetSegments();

        // Announce all 3 targets: chime + first number, then second and third
        const callouts = [];
        if (!state.gameOver) {
            callouts.push({ type: 'remaining', value: state.sequence[0] });
            callouts.push({ type: 'checkout', value: state.sequence[1] });
            callouts.push({ type: 'checkout', value: state.sequence[2] });
        }

        return { state, event: 'switch', callouts };
    }

    // Initial callouts for game start (first player never gets a nextPlayer call)
    function getCallouts() {
        if (state.gameOver) {
            return [];
        }
        return [
            { type: 'remaining', value: state.sequence[0] },
            { type: 'checkout', value: state.sequence[1] },
            { type: 'checkout', value: state.sequence[2] },
        ];
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
    }

    updateTargetSegments();

    return { onDart, nextPlayer, getCallouts, getState, loadState };
}
