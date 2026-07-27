// Game registry — the app's full game descriptors.
//
// The node-safe half (factory, meta, option schema, AI aim, and the play order)
// lives in games-logic.js so headless tools can share it; this module imports
// that and layers on the DOM-bound panels and setup screens. Consumers
// (manager.js, game-controller.js, ai/ai.js) derive their maps from GAMES.

import { GAME_LOGIC } from './games-logic.js';

import { createCountUpPanel } from '../../games/count-up/panel.js';
import { createCountUpSetup } from '../../games/count-up/setup.js';
import { createSimonSaysPanel } from '../../games/simon-says/panel.js';
import { createSimonSaysSetup } from '../../games/simon-says/setup.js';
import { createAroundTheClockPanel } from '../../games/around-the-clock/panel.js';
import { createAroundTheClockSetup } from '../../games/around-the-clock/setup.js';
import { createScoreRushPanel } from '../../games/score-rush/panel.js';
import { createScoreRushSetup } from '../../games/score-rush/setup.js';
import { createHalfItPanel } from '../../games/half-it/panel.js';
import { createHalfItSetup } from '../../games/half-it/setup.js';
import { createShanghaiPanel } from '../../games/shanghai/panel.js';
import { createShanghaiSetup } from '../../games/shanghai/setup.js';
import { createCatAndMousePanel } from '../../games/cat-and-mouse/panel.js';
import { createCatAndMouseSetup } from '../../games/cat-and-mouse/setup.js';
import { createCricketPanel } from '../../games/cricket/panel.js';
import { createCricketSetup } from '../../games/cricket/setup.js';
import { createAllFivesPanel } from '../../games/all-fives/panel.js';
import { createAllFivesSetup } from '../../games/all-fives/setup.js';
import { createX01Panel } from '../../games/x01/panel.js';
import { createX01Setup } from '../../games/x01/setup.js';
import { createBobs27Panel } from '../../games/bobs-27/panel.js';
import { createBobs27Setup } from '../../games/bobs-27/setup.js';
import { createScramPanel } from '../../games/scram/panel.js';
import { createScramSetup } from '../../games/scram/setup.js';
import { createKillerPanel } from '../../games/killer/panel.js';
import { createKillerSetup } from '../../games/killer/setup.js';
import { createDominationPanel } from '../../games/domination/panel.js';
import { createDominationSetup } from '../../games/domination/setup.js';

// UI factories by game type, merged onto the logic descriptors.
const UI = {
    'count-up': { createPanel: createCountUpPanel, createSetup: createCountUpSetup },
    'simon-says': { createPanel: createSimonSaysPanel, createSetup: createSimonSaysSetup },
    'around-the-clock': { createPanel: createAroundTheClockPanel, createSetup: createAroundTheClockSetup },
    'score-rush': { createPanel: createScoreRushPanel, createSetup: createScoreRushSetup },
    'half-it': { createPanel: createHalfItPanel, createSetup: createHalfItSetup },
    'shanghai': { createPanel: createShanghaiPanel, createSetup: createShanghaiSetup },
    'cat-and-mouse': { createPanel: createCatAndMousePanel, createSetup: createCatAndMouseSetup },
    'cricket': { createPanel: createCricketPanel, createSetup: createCricketSetup },
    'all-fives': { createPanel: createAllFivesPanel, createSetup: createAllFivesSetup },
    'x01': { createPanel: createX01Panel, createSetup: createX01Setup },
    'bobs-27': { createPanel: createBobs27Panel, createSetup: createBobs27Setup },
    'scram': { createPanel: createScramPanel, createSetup: createScramSetup },
    'killer': { createPanel: createKillerPanel, createSetup: createKillerSetup },
    'domination': { createPanel: createDominationPanel, createSetup: createDominationSetup },
};

// Ordered list of every game (order = recommended play order, from games-logic).
export const GAMES = GAME_LOGIC.map((game) => ({ ...game, ...UI[game.type] }));

// Descriptor lookup by game type; undefined for an unknown type.
export function getGame(type) {
    return GAMES.find((game) => game.type === type);
}
