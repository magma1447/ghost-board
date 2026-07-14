// Generate mid-game saved states for the gameplay screenshots by running the
// real game engine headless (the same games-logic.js the test suite imports),
// then writing each result into screenshot-engine/gameplay-<type>/storage.json
// under the ghost-board-game key (alongside the settings names resolve from).
//
// Engine-produced, so a state can't diverge from what the app's loadState()
// accepts — re-run whenever game logic changes, like re-baselining the tests.
//
// Run as your host user so output isn't root-owned (see README.md):
//   HOST_UID=$(id -u) HOST_GID=$(id -g) \
//     docker compose -f docker/compose.yaml run --rm toolbox node screenshot-engine/generate-states.mjs

import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GAME_LOGIC } from '../app/src/game-engine/core/games-logic.js';
import { applyScatter, AI_PROFILES } from '../app/src/ai/scatter.js';
import { installSeededRandom } from '../test/seeded-random.mjs';

const SHOTS_DIR = fileURLToPath(new URL('.', import.meta.url));
const LOGIC = Object.fromEntries(GAME_LOGIC.map((g) => [g.type, g]));

// Demo roster — names resolve from ghost-board-settings.players via these uuids.
const ROSTER = [
    { uuid: 'demo-a', name: 'Ghost' },
    { uuid: 'demo-b', name: 'Pac' },
    { uuid: 'demo-c', name: 'Blinky' },
];

const RINGS = ['SO', 'SI', 'D', 'T'];
function randomDart() {
    const r = Math.random();
    if (r < 0.03) {
        return { ring: 'DBULL', segment: 50 };
    }
    if (r < 0.06) {
        return { ring: 'SBULL', segment: 25 };
    }
    return { ring: RINGS[Math.floor(Math.random() * 4)], segment: 1 + Math.floor(Math.random() * 20) };
}

// Play `darts` darts on an existing game (stopping mid-turn for a live-looking
// board), driven by AI at `level` — or random darts when the game has no AI aim.
function playDarts(game, logic, darts, level) {
    const profile = AI_PROFILES[level];
    let thrown = 0;
    let guard = 0;
    while (thrown < darts && !game.getState().isGameOver && guard < darts * 4 + 200) {
        guard++;
        const state = game.getState();
        if (state.turn.locked || state.turn.darts.length >= state.dartsPerTurn) {
            game.nextPlayer();
            continue;
        }
        const hit = logic.aim ? applyScatter(logic.aim(state, profile), profile) : randomDart();
        game.onDart(hit.ring, hit.segment);
        thrown++;
    }
    return game;
}

function settings(playerCount) {
    const used = ROSTER.slice(0, playerCount);
    return {
        players: used,
        lastPlayers: used.map((p) => p.uuid),
        debug: { mouseInput: true },
    };
}

// Write one shot's storage.json: settings (names resolve from here) + the saved
// game blob { type, options, state, match } exactly as game-store persists it.
function writeShot(name, playerCount, blob) {
    const storage = {
        'ghost-board-settings': settings(playerCount),
        'ghost-board-game': blob,
    };
    const dir = path.join(SHOTS_DIR, name);
    fs.mkdirSync(dir, { recursive: true });
    fs.writeFileSync(path.join(dir, 'storage.json'), `${JSON.stringify(storage, null, 2)}\n`);
}

// A game built with the standard seat options, ready to play.
function newGame(type, playerCount, extraOptions = {}) {
    const playerUuids = ROSTER.slice(0, playerCount).map((p) => p.uuid);
    const options = { numPlayers: playerCount, playerUuids, startingPlayerIndex: 0, ...extraOptions };
    return { game: LOGIC[type].createGame(options), options, playerUuids };
}

// One entry per game-mode gameplay shot. Dart counts chosen to leave a lively
// mid-game board (not finished); tune per game after eyeballing.
const SCENARIOS = [
    { shot: 'gameplay-count-up', type: 'count-up', players: 2, level: 6, darts: 15, seed: 11 },
    { shot: 'gameplay-simon-says', type: 'simon-says', players: 2, level: 6, darts: 12, seed: 12 },
    { shot: 'gameplay-around-the-clock', type: 'around-the-clock', players: 2, level: 6, darts: 20, seed: 13 },
    { shot: 'gameplay-score-rush', type: 'score-rush', players: 2, level: 6, darts: 3, seed: 14 },
    { shot: 'gameplay-half-it', type: 'half-it', players: 2, level: 6, darts: 14, seed: 15 },
    { shot: 'gameplay-shanghai', type: 'shanghai', players: 2, level: 6, darts: 12, seed: 16 },
    { shot: 'gameplay-cat-and-mouse', type: 'cat-and-mouse', players: 2, level: 6, darts: 20, seed: 17 },
    { shot: 'gameplay-cricket', type: 'cricket', players: 2, level: 6, darts: 20, seed: 18 },
    { shot: 'gameplay-all-fives', type: 'all-fives', players: 2, level: 6, darts: 12, seed: 19 },
    { shot: 'gameplay-x01', type: 'x01', players: 2, level: 6, darts: 24, seed: 20 },
    { shot: 'gameplay-bobs-27', type: 'bobs-27', players: 2, level: 6, darts: 15, seed: 21 },
    { shot: 'gameplay-scram', type: 'scram', players: 2, level: 6, darts: 18, seed: 22 },
    { shot: 'gameplay-killer', type: 'killer', players: 3, level: 6, darts: 18, seed: 23 },
];

for (const sc of SCENARIOS) {
    installSeededRandom(sc.seed);
    const { game, options } = newGame(sc.type, sc.players, sc.options || {});
    playDarts(game, LOGIC[sc.type], sc.darts, sc.level);
    writeShot(sc.shot, sc.players, { type: sc.type, options, state: game.getState(), match: null });
    const s = game.getState();
    console.log(`${sc.shot.padEnd(28)} round=${s.round ?? '-'} over=${s.isGameOver}`);
}

// --- Special states (feature shots beyond plain gameplay) ---

// Match play: an X01 leg in progress, best of 5 legs, Ghost 1-0 up in leg 2.
installSeededRandom(50);
{
    const { game, options, playerUuids } = newGame('x01', 2, { legsBestOf: 5 });
    playDarts(game, LOGIC['x01'], 10, 6);
    const match = {
        legsBestOf: 5,
        setsBestOf: 1,
        playerUuids: [...playerUuids],
        numPlayers: 2,
        legNumber: 2,
        legsWon: [1, 0],
        setsWon: [0, 0],
        legResults: [{ set: 1, winner: 0 }],
    };
    writeShot('match-play', 2, { type: 'x01', options, state: game.getState(), match });
    console.log('match-play                   best of 5 legs, 1-0 in leg 2');
}

// Win overlay: an X01 leg one double from the finish — player 0 on 40, so a
// single debug board-click on D20 lands the double-out and fires the win
// animation (win-overlay/steps.mjs does the click).
installSeededRandom(51);
{
    const { game, options } = newGame('x01', 2);
    playDarts(game, LOGIC['x01'], 12, 6); // populate averages / history
    const state = game.getState();
    state.currentPlayerIndex = 0;
    state.players[0].score = 40; // one double (D20) from a double-out win
    state.turn = { darts: [], locked: false };
    writeShot('win-overlay', 2, { type: 'x01', options, state, match: null });
    console.log('win-overlay                  Ghost on 40 (D20 to win)');
}

console.log(`\nWrote ${SCENARIOS.length} gameplay + 2 special states.`);
