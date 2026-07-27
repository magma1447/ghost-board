// Domination — a territory game. Everyone claims a starting number, then spreads
// by taking over NEIGHBOURING numbers. Adjacency is the physical board ring, so
// a number's neighbours are the two beside it in board order (20's are 5 and 1),
// not 19/21. Hitting a number that isn't next to your territory does nothing.
//
// An empty (neutral) number takes one hit to claim. A number an opponent owns
// takes two: a single clears them off it (→ neutral), while a double or treble
// lands both hits at once and takes it outright. Lose your last number and you're
// out. Reach the domination target (a share of the board, checked after every
// dart) to win outright; otherwise the most territory at the round cap wins.
// 2–8 players.
//
// The bull, when enabled, is a 21st territory neighbouring EVERY number: hold any
// number and you can always contest it; hold the bull and you can attack anywhere.
//
// Returns { state, event, callouts } from onDart() and nextPlayer().
// Events: null (claim / take / neutralise), 'miss', 'switch', 'half' (the
//   assign→play handoff), 'win', 'draw', 'ignored'. No voice callouts (no score).

import { currentPlayer, ignoredDart, stashTurn, SUDDEN_DEATH_CAP } from '../../game-engine/shared/game-helpers.js';
import { BOARD_ORDER } from '../../board/segments.js';
import { dominationGroups, switchColor } from './colors.js';

// Ring adjacency: a number's neighbours are the two beside it in the board's
// clockwise order, wrapping around.
const RING_INDEX = new Map(BOARD_ORDER.map((num, i) => [num, i]));
function ringNeighbours(num) {
    const i = RING_INDEX.get(num);
    return [BOARD_ORDER[(i + 19) % 20], BOARD_ORDER[(i + 1) % 20]];
}

// A double, treble, or double-bull lands two hits at once (enough to take an
// enemy number outright); a single or single-bull is one hit.
function hitStrength(ring) {
    return ring === 'D' || ring === 'T' || ring === 'DBULL' ? 2 : 1;
}

// Fisher–Yates shuffle, in place (returns the same array).
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

export function createDomination({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    bull = true,
    winPercent = 100,
    maxRounds = 20,
    onDraw = 'draw',
    numberAssignment = 'throw',
    startingPlayerIndex = 0,
} = {}) {
    const totalCells = 20 + (bull ? 1 : 0);
    // Cells needed to win outright (checked after every dart). 100% = the lot.
    const winThreshold = Math.ceil((winPercent / 100) * totalCells);

    // Every cell → owning player index, or null for neutral. Bull is a cell too.
    const owners = {};
    for (const num of BOARD_ORDER) {
        owners[num] = null;
    }
    if (bull) {
        owners.bull = null;
    }

    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({ uuid: playerUuids[i], home: null, tiles: 0, out: false, lastDarts: [] });
    }

    const state = {
        type: 'domination',
        dartsPerTurn,
        options: { bull, winPercent, maxRounds, onDraw, numberAssignment },
        owners,
        totalCells,
        winThreshold,
        players,
        // Throw-off order is randomised (as in Killer) so the first-listed player
        // doesn't always get first pick of a number.
        assignOrder: shuffle(players.map((unused, i) => i)),
        assignPos: 0,
        assignIndex: 0,
        currentPlayerIndex: startingPlayerIndex,
        turn: { darts: [], locked: false },
        round: 1,
        phase: 'assign',
        isGameOver: false,
        winner: null,
        // cell → owner index: a player's last number, neutralised but not yet
        // taken, reverts to them at turn end (see nextPlayer). Eliminating a
        // player always costs a real capture, never a bare neutralise.
        pendingRevert: {},
        frontier: [], // cells the current player can attack (drives the highlight)
        targetSegments: [], // numbered frontier cells (the LED ring has no bull arc)
        warnSegments: [], // during assign: numbers already taken
        boardPaint: [], // LED ring colour groups — the territory map (see colors.js)
        switchColor: null, // incoming player's colour for the player-switch sweep
        switchFromColor: null, // outgoing player's colour, for the handoff sweep
        transition: null, // overlay text for the assign→play 'half' handoff
    };
    state.assignIndex = state.assignOrder[0];

    const allCells = () => (bull ? [...BOARD_ORDER, 'bull'] : [...BOARD_ORDER]);

    // A cell's neighbours: its two ring neighbours, plus the bull (adjacent to
    // every number). The bull itself neighbours every number.
    function cellNeighbours(cell) {
        if (cell === 'bull') {
            return [...BOARD_ORDER];
        }
        const res = ringNeighbours(cell);
        if (bull) {
            res.push('bull');
        }
        return res;
    }

    // Can this player act on this cell? Only if they own one of its neighbours
    // (the caller checks it isn't already theirs).
    function attackable(playerIdx, cell) {
        return cellNeighbours(cell).some((nb) => state.owners[nb] === playerIdx);
    }

    // Which cell a dart landed on: a number 1–20, 'bull' (only when bull is in
    // play), or null (a bull hit with bull off, or anything else).
    function cellFor(ring, segment) {
        if (ring === 'SBULL' || ring === 'DBULL') {
            return bull ? 'bull' : null;
        }
        return segment >= 1 && segment <= 20 ? segment : null;
    }

    // Move a cell to a new owner (or null = neutral), keeping tile counts and the
    // `out` flag in step. A player is eliminated only when their LAST number is
    // TAKEN (owned by an enemy) — merely neutralising it queues a revert instead
    // (see nextPlayer), so a kill always costs a real capture.
    function setOwner(cell, ownerIdx) {
        const prev = state.owners[cell];
        if (prev === ownerIdx) {
            return;
        }
        state.owners[cell] = ownerIdx;
        if (prev !== null) {
            state.players[prev].tiles -= 1;
            if (state.players[prev].tiles <= 0 && state.phase === 'play') {
                if (ownerIdx !== null) {
                    state.players[prev].out = true; // their last number was taken outright
                } else {
                    state.pendingRevert[cell] = prev; // only neutralised — reverts unless claimed this turn
                }
            }
        }
        if (ownerIdx !== null) {
            state.players[ownerIdx].tiles += 1;
            // Claiming a number that was a player's neutralised last cell finishes
            // the capture — that player is out now.
            if (cell in state.pendingRevert) {
                state.players[state.pendingRevert[cell]].out = true;
                delete state.pendingRevert[cell];
            }
        }
    }

    // The current player's attackable cells (neutral or enemy, adjacent to their
    // territory). During assign, instead flag the numbers already claimed.
    function refreshBoard() {
        if (state.phase === 'assign') {
            state.frontier = [];
            state.targetSegments = [];
            state.warnSegments = state.players.filter((p) => p.home !== null).map((p) => p.home);
        } else if (state.isGameOver || state.players[state.currentPlayerIndex].out) {
            state.frontier = [];
            state.targetSegments = [];
            state.warnSegments = [];
        } else {
            const me = state.currentPlayerIndex;
            const frontier = [];
            for (const cell of allCells()) {
                if (state.owners[cell] !== me && attackable(me, cell)) {
                    frontier.push(cell);
                }
            }
            state.frontier = frontier;
            state.targetSegments = frontier.filter((c) => c !== 'bull');
            state.warnSegments = [];
        }
        // Full board paint (colour groups) for the LED ring — the territory map.
        state.boardPaint = dominationGroups(state);
        state.switchColor = switchColor(state);
    }

    // Highest territory wins; a tie for the lead returns null (draw / sudden death).
    function determineWinner() {
        let best = -1;
        let bestIdx = null;
        let tie = false;
        for (let i = 0; i < state.players.length; i++) {
            if (state.players[i].out) {
                continue;
            }
            if (state.players[i].tiles > best) {
                best = state.players[i].tiles;
                bestIdx = i;
                tie = false;
            } else if (state.players[i].tiles === best) {
                tie = true;
            }
        }
        return tie ? null : bestIdx;
    }

    // After an ownership change: win by reaching the domination target, or by
    // being the last player left with any territory. Returns 'win' / 'draw' / null.
    function checkGameEnd(meIdx) {
        if (state.players[meIdx].tiles >= winThreshold) {
            state.isGameOver = true;
            state.winner = meIdx;
            return 'win';
        }
        const alive = state.players.filter((p) => !p.out);
        if (alive.length === 1) {
            state.isGameOver = true;
            state.winner = state.players.indexOf(alive[0]);
            return 'win';
        }
        if (alive.length === 0) {
            state.isGameOver = true;
            state.winner = null;
            return 'draw';
        }
        return null;
    }

    // Random assignment: deal distinct starting numbers and jump straight to play.
    if (numberAssignment === 'random') {
        const pool = shuffle([...BOARD_ORDER]).slice(0, numPlayers);
        state.players.forEach((p, i) => {
            p.home = pool[i];
            setOwner(pool[i], i);
        });
        state.phase = 'play';
        state.currentPlayerIndex = startingPlayerIndex;
    }

    // Assign phase: the current thrower keeps throwing until they land a valid,
    // free number (a number 1–20, not the bull, not already taken).
    function onDartAssign(ring, segment) {
        const cell = cellFor(ring, segment);
        const validNumber = typeof cell === 'number';
        if (!validNumber || state.owners[cell] !== null) {
            return { state, event: 'miss', callouts: [] };
        }
        const idx = state.assignIndex;
        state.players[idx].home = cell;
        setOwner(cell, idx);
        state.assignPos += 1;
        if (state.assignPos >= state.players.length) {
            state.phase = 'play';
            state.currentPlayerIndex = startingPlayerIndex;
            state.round = 1;
            // Everyone's claimed — hand into play as a phase transition ('half'):
            // the controller clears the last claim's highlight and shows the overlay.
            state.transition = { title: 'Numbers claimed', subtitle: 'Spread out and conquer' };
            refreshBoard();
            return { state, event: 'half', callouts: [] };
        }
        state.assignIndex = state.assignOrder[state.assignPos];
        refreshBoard();
        return { state, event: null, callouts: [] };
    }

    function onDart(ring, segment) {
        if (state.phase === 'assign') {
            return onDartAssign(ring, segment);
        }
        const ignored = ignoredDart(state, dartsPerTurn);
        if (ignored) {
            return ignored;
        }

        const meIdx = state.currentPlayerIndex;
        const cell = cellFor(ring, segment);
        let hit = false;
        let event = 'miss';

        if (cell !== null && state.owners[cell] !== meIdx && attackable(meIdx, cell)) {
            if (state.owners[cell] === null) {
                setOwner(cell, meIdx); // claim a neutral cell (one hit)
            } else if (hitStrength(ring) >= 2) {
                setOwner(cell, meIdx); // take an enemy cell outright (two hits at once)
            } else {
                setOwner(cell, null); // one hit clears the enemy off it → neutral
            }
            hit = true;
            event = checkGameEnd(meIdx) || null;
        }

        state.turn.darts.push({ ring, segment, hit, points: 0 });
        refreshBoard();
        return { state, event, callouts: [] };
    }

    function nextPlayer() {
        // Colour of the player leaving the turn, captured before we advance — the
        // handoff sweep runs from this to the incoming player's colour.
        const leavingColor = switchColor(state);

        // Revert this turn's neutralised last-cells that weren't claimed — a bare
        // neutralise doesn't eliminate; the number goes back to its owner as if it
        // was never hit. Clear the map first so the revert's setOwner doesn't
        // re-trigger the "claim finishes the capture" path.
        const pending = state.pendingRevert;
        state.pendingRevert = {};
        for (const [cellKey, ownerIdx] of Object.entries(pending)) {
            const cell = cellKey === 'bull' ? 'bull' : Number(cellKey);
            if (state.owners[cell] === null) {
                setOwner(cell, ownerIdx);
            }
        }
        stashTurn(state);

        // Last player standing (a mid-turn elimination already ends it — this is a
        // defensive re-check).
        const alive = state.players.filter((p) => !p.out);
        if (alive.length <= 1) {
            state.isGameOver = true;
            state.winner = alive.length === 1 ? state.players.indexOf(alive[0]) : null;
            refreshBoard();
            return { state, event: state.winner !== null ? 'win' : 'draw', callouts: [] };
        }

        // Advance to the next player still in the game (skip anyone out); bump the
        // round when we wrap back to the lowest-indexed survivor.
        const lowest = state.players.findIndex((p) => !p.out);
        do {
            state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        } while (state.players[state.currentPlayerIndex].out);
        if (state.currentPlayerIndex === lowest) {
            state.round += 1;
        }

        // Round cap: decide by most territory, only at a round boundary (so sudden
        // death doesn't hand it to whoever throws first). Perfectly-tied play
        // settles for a draw after the cap.
        if (maxRounds !== null && state.currentPlayerIndex === lowest && state.round > maxRounds) {
            const winner = determineWinner();
            const capped = state.round > maxRounds + SUDDEN_DEATH_CAP;
            if (winner !== null || onDraw === 'draw' || capped) {
                state.isGameOver = true;
                state.winner = winner;
                refreshBoard();
                return { state, event: winner !== null ? 'win' : 'draw', callouts: [] };
            }
        }

        refreshBoard();
        state.switchFromColor = leavingColor;
        return { state, event: 'switch', callouts: [] };
    }

    function getCallouts() {
        return [];
    }

    // Big heads-up number: how many zones the current player holds.
    function getHeadline() {
        if (state.phase === 'assign') {
            return '';
        }
        return String(currentPlayer(state).tiles);
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
        refreshBoard();
    }

    refreshBoard();

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
