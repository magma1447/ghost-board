// AI opponent throw — apply the shared board-scatter to a game's chosen aim.
//
// The aim ("where to throw") is per game and lives with the game
// (src/games/<game>/ai.js), registered on its registry entry as `aim`. This
// module resolves that strategy by game type and adds the scatter + fumble from
// scatter.js — so adding AI to a new game means dropping an ai.js in its folder
// and registering it, with nothing to change here.

import { AI_PROFILES, gaussian, aimPoint, pointToHit, RING_RADIUS } from './scatter.js';
import { GAMES } from '../game-engine/core/registry.js';

// type → aim strategy, drawn from the games that ship one.
const STRATEGIES = Object.fromEntries(
    GAMES.filter((game) => game.aim).map((game) => [game.type, game.aim]),
);

// One AI dart: the scored { ring, segment } plus the aim and landing points
// (board coords) for the debug overlay.
export function aiThrow(gameType, state, level) {
    const profile = AI_PROFILES[level] || AI_PROFILES[5];
    const strategy = STRATEGIES[gameType];
    const aim = strategy ? strategy(state, profile) : { segment: 25, radius: RING_RADIUS.bull };

    const aimXY = aimPoint(aim.segment, aim.radius);
    const spread = Math.random() < profile.fumbleChance ? profile.fumbleScatter : 1;
    const land = {
        x: aimXY.x + gaussian() * profile.scatterHorizontal * spread,
        y: aimXY.y + gaussian() * profile.scatterVertical * spread,
    };
    return { ...pointToHit(land.x, land.y), aim: aimXY, land, aimTarget: pointToHit(aimXY.x, aimXY.y) };
}
