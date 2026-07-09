// Killer — claim a number, arm yourself into a "killer", then knock the lives
// off opponents by hitting their number. Drop to 0 lives and you're out; last
// player standing wins. 2–8 players.
//
// Three modes (a setup option), each internally consistent:
//   standard        — count-up, any ring. Hit your own number to gain lives
//                     (single/double/treble = +1/+2/+3, capped at the lives
//                     value); reach the cap to become a killer. As a killer,
//                     hitting an opponent's number removes 1/2/3. Losing a life
//                     — attacked, or self-kill — drops you below the cap, so you
//                     revert to a non-killer and must re-earn it.
//   double-trouble  — doubles only. Your double arms you; an opponent's double
//                     costs them one life. Other rings on a number do nothing.
//   treble-trouble  — the same, but the treble is the qualifying ring.
//
// Shared options: lives (start value / cap), selfKill (a killer hitting its own
// qualifying target loses a life — can self-out), straightOff (everyone starts
// armed), numberAssignment (throw for a free number, or dealt at random).
//
// Returns { state, event, callouts } from onDart() and nextPlayer().
// Events: null (mark / arm / life change), 'miss', 'switch', 'half' (the
//   assign→play handoff), 'win', 'draw', 'ignored'. No voice callouts (no score).

import { currentPlayer } from '../../game-engine/shared/game-helpers.js';

// Ring → life multiplier. Numbers are 1–20, so bull rings never apply.
function ringMultiplier(ring) {
    if (ring === 'T') {
        return 3;
    }
    if (ring === 'D') {
        return 2;
    }
    return 1; // single in / single out
}

// Fisher–Yates shuffle, in place (returns the same array).
function shuffle(arr) {
    for (let i = arr.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [arr[i], arr[j]] = [arr[j], arr[i]];
    }
    return arr;
}

// A shuffled 1–20, sliced to `count` — distinct random numbers for players.
function dealRandomNumbers(count) {
    const pool = [];
    for (let n = 1; n <= 20; n++) {
        pool.push(n);
    }
    return shuffle(pool).slice(0, count);
}

export function createKiller({
    numPlayers = 2,
    playerUuids = [],
    dartsPerTurn = 3,
    mode = 'standard',
    numberAssignment = 'throw',
    lives = 3,
    selfKill = true,
    straightOff = false,
    startingPlayerIndex = 0,
} = {}) {
    // Double- and treble-trouble share one code path; only the qualifying ring
    // differs.
    const reqRing = mode === 'treble-trouble' ? 'T' : 'D';

    // Starting lives / killer flag once play begins, per mode and straightOff.
    // In standard without straightOff you count up from 0 to the cap; the other
    // modes keep full lives and only the killer flag varies.
    function startingStats() {
        if (mode === 'standard') {
            return straightOff ? { lives, killer: true } : { lives: 0, killer: false };
        }
        return { lives, killer: straightOff };
    }

    const start = startingStats();
    const players = [];
    for (let i = 0; i < numPlayers; i++) {
        players.push({
            uuid: playerUuids[i],
            number: null,
            lives: start.lives,
            killer: start.killer,
            out: false,
            lastDarts: [],
        });
    }

    // Throwing for numbers is played in a RANDOM order, so the first player in
    // the setup list doesn't always get first pick of the best number. The list
    // order is unchanged (display only) — only who throws when. assignIndex is
    // the current thrower's player-array index, for the panel highlight.
    const assignOrder = shuffle(players.map((_, i) => i));

    // Random assignment deals distinct numbers up front and jumps straight to
    // play; throwing for numbers opens in the assign phase with numbers unset.
    let phase = 'assign';
    if (numberAssignment === 'random') {
        const nums = dealRandomNumbers(numPlayers);
        players.forEach((p, i) => {
            p.number = nums[i];
        });
        phase = 'play';
    }

    const state = {
        type: 'killer',
        dartsPerTurn,
        options: { mode, numberAssignment, lives, selfKill, straightOff },
        mode,
        cap: lives, // only used by standard
        phase,
        players,
        assignOrder, // randomised throw-off order (player-array indices)
        assignPos: 0, // position within assignOrder
        assignIndex: assignOrder[0], // current thrower (player index) — panel highlight
        currentPlayerIndex: startingPlayerIndex,
        turn: { darts: [], locked: false },
        round: 1,
        isGameOver: false,
        winner: null,
        targetSegments: [], // green LED ring: opponents' numbers
        warnSegments: [], // red LED ring: your own number when it's a hazard
        transition: null, // overlay text for the assign→play 'half' handoff
    };

    // LED ring: during play, every in-play player's number; during assign, the
    // numbers already claimed (so throwers see what's taken).
    function refreshTargets() {
        if (state.phase === 'assign') {
            // Taken numbers show red on the ring (nothing green — you're claiming
            // a free number, not aiming at a specific one).
            state.targetSegments = [];
            state.warnSegments = state.players
                .filter((p) => p.number !== null)
                .map((p) => p.number);
            return;
        }
        const me = state.players[state.currentPlayerIndex];
        if (state.isGameOver || !me || me.out) {
            state.targetSegments = [];
            state.warnSegments = [];
            return;
        }
        if (!me.killer) {
            // Building up: your own number is your target — green. Opponents
            // aren't attackable yet, so leave them dark.
            state.targetSegments = me.number !== null ? [me.number] : [];
            state.warnSegments = [];
        } else {
            // Killer: opponents' numbers are green targets. Your own number is
            // red only when self-kill is on (a hazard); otherwise it's dark.
            state.targetSegments = state.players
                .filter((p) => !p.out && p !== me && p.number !== null)
                .map((p) => p.number);
            state.warnSegments = selfKill && me.number !== null ? [me.number] : [];
        }
    }

    // Apply an elimination if the player's lives ran out, then check for a game
    // end. Returns 'win' (one player left), 'draw' (none left), or null.
    function checkElimination(p) {
        if (p.lives <= 0) {
            p.lives = 0;
            p.out = true;
            const remaining = state.players.filter((x) => !x.out);
            if (remaining.length === 1) {
                state.isGameOver = true;
                state.winner = state.players.indexOf(remaining[0]);
                return 'win';
            }
            if (remaining.length === 0) {
                state.isGameOver = true;
                state.winner = null;
                return 'draw';
            }
        }
        return null;
    }

    // Assign phase: the current thrower keeps throwing until they land a valid,
    // free number. No dartsPerTurn limit and no turn tracking here.
    function onDartAssign(ring, segment) {
        const validRing = ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T';
        const inRange = segment >= 1 && segment <= 20;
        const taken = state.players.some((p) => p.number === segment);
        // Miss / bull / out-of-range / already-taken → re-throw, same player.
        if (!validRing || !inRange || taken) {
            return { state, event: 'miss', callouts: [] };
        }

        state.players[state.assignIndex].number = segment;
        // Advance through the randomised throw-off order; done once we pass the
        // last thrower.
        state.assignPos += 1;
        if (state.assignPos >= state.players.length) {
            const stats = startingStats();
            for (const p of state.players) {
                p.lives = stats.lives;
                p.killer = stats.killer;
            }
            state.phase = 'play';
            state.currentPlayerIndex = startingPlayerIndex;
            state.round = 1;
            // Everyone's claimed a number — hand off into play as a phase
            // transition ('half'): the controller clears the last claim's
            // highlight, plays the switch sweep, and surfaces this overlay.
            state.transition = { title: 'Numbers set', subtitle: 'The game begins' };
            refreshTargets();
            return { state, event: 'half', callouts: [] };
        }
        state.assignIndex = state.assignOrder[state.assignPos];
        refreshTargets();
        return { state, event: null, callouts: [] };
    }

    function onDart(ring, segment) {
        if (state.phase === 'assign') {
            return onDartAssign(ring, segment);
        }

        // Dart didn't count (game over, or turn already complete/locked) —
        // 'ignored' lets the UI skip audio while LEDs still flash.
        if (state.isGameOver) {
            return { state, event: 'ignored', callouts: [] };
        }
        if (state.turn.locked || state.turn.darts.length >= dartsPerTurn) {
            return { state, event: 'ignored', callouts: [] };
        }

        const me = currentPlayer(state);
        // The in-play player who owns this number (if any).
        const owner = state.players.find((p) => !p.out && p.number === segment);

        let hit = false;
        let event = 'miss';

        if (state.mode === 'standard') {
            const m = ringMultiplier(ring);
            if (owner === me) {
                if (!me.killer) {
                    // Count up toward the cap; reaching it arms you.
                    me.lives = Math.min(state.cap, me.lives + m);
                    me.killer = me.lives >= state.cap;
                    hit = true;
                    event = null;
                } else if (selfKill) {
                    // Already a killer: hitting your own number costs you, which
                    // drops you below the cap — so you're no longer a killer and
                    // must climb back to it.
                    me.lives -= m;
                    me.killer = me.lives >= state.cap;
                    hit = true;
                    event = checkElimination(me);
                }
            } else if (owner && me.killer) {
                // Attack an opponent's number: any life they lose reverts them to
                // a non-killer (they re-earn back up to the cap).
                owner.lives -= m;
                owner.killer = owner.lives >= state.cap;
                hit = true;
                event = checkElimination(owner);
            }
        } else {
            // double-trouble / treble-trouble: only the qualifying ring acts.
            if (ring === reqRing) {
                if (owner === me) {
                    if (!me.killer) {
                        me.killer = true;
                        hit = true;
                        event = null;
                    } else if (selfKill) {
                        me.lives -= 1;
                        hit = true;
                        event = checkElimination(me);
                    }
                } else if (owner && me.killer) {
                    owner.lives -= 1;
                    hit = true;
                    event = checkElimination(owner);
                }
            }
        }

        state.turn.darts.push({ ring, segment, hit, points: 0 });
        refreshTargets();
        return { state, event, callouts: [] };
    }

    // Play phase only — the assign phase advances players inside onDart.
    function nextPlayer() {
        const leaving = currentPlayer(state);
        leaving.lastDarts = state.turn.darts.slice(); // keep visible until their next turn
        state.turn = { darts: [], locked: false };

        // Last player standing wins (a kill on the final dart of a turn would
        // already have ended it, but re-check defensively).
        const remaining = state.players.filter((p) => !p.out);
        if (remaining.length <= 1) {
            state.isGameOver = true;
            state.winner = remaining.length === 1 ? state.players.indexOf(remaining[0]) : null;
            refreshTargets();
            return { state, event: state.winner !== null ? 'win' : 'draw', callouts: [] };
        }

        // Advance to the next player still in the game (skip anyone out); bump
        // the round when we wrap back to the lowest-indexed active player.
        const lowest = state.players.findIndex((p) => !p.out);
        do {
            state.currentPlayerIndex = (state.currentPlayerIndex + 1) % state.players.length;
        } while (state.players[state.currentPlayerIndex].out);
        if (state.currentPlayerIndex === lowest) {
            state.round++;
        }

        refreshTargets();
        return { state, event: 'switch', callouts: [] };
    }

    function getCallouts() {
        return [];
    }

    // Big heads-up number: the current player's lives (nothing during assign).
    function getHeadline() {
        if (state.phase === 'assign') {
            return '';
        }
        return String(currentPlayer(state).lives);
    }

    function getState() {
        return state;
    }

    function loadState(saved) {
        Object.assign(state, saved);
        refreshTargets();
    }

    refreshTargets();

    return { onDart, nextPlayer, getCallouts, getHeadline, getState, loadState };
}
