// AI opponent throw — apply the shared board-scatter to a game's chosen aim.
//
// The aim ("where to throw") is per game and lives with the game
// (src/games/<game>/ai.js), registered on its games-logic entry as `aim`. This
// module resolves that strategy by game type and adds the scatter + fumble from
// scatter.js — so adding AI to a new game means dropping an ai.js in its folder
// and registering it, with nothing to change here. Importing the UI-free game
// list (not registry.js) keeps this module usable headlessly.

import { AI_PROFILES, RING_RADIUS, applyScatter } from './scatter.js';
import { GAME_LOGIC } from '../game-engine/core/games-logic.js';

// type → aim strategy, drawn from the games that ship one.
const STRATEGIES = Object.fromEntries(
    GAME_LOGIC.filter((game) => game.aim).map((game) => [game.type, game.aim]),
);

// One AI dart: the scored { ring, segment } plus the aim and landing points
// (board coords) for the debug overlay.
export function aiThrow(gameType, state, level) {
    const profile = AI_PROFILES[level] || AI_PROFILES[5];
    const strategy = STRATEGIES[gameType];
    const aim = strategy ? strategy(state, profile) : { segment: 25, radius: RING_RADIUS.bull };
    return applyScatter(aim, profile);
}
