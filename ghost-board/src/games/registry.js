// Game registry — the single ordered source of truth for every game.
//
// Each descriptor bundles everything the app needs for a game type: its label,
// its factory functions (createGame / createPanel / createSetup) and its meta
// (short synopsis, option blurbs, player range, difficulty ratings, tags).
// Consumers (manager.js, game-controller.js) derive their per-game maps from
// this array instead of maintaining parallel ones.
//
// The array order IS the recommended play order — gentlest first — and drives
// the order games appear in the picker. Reorder entries here to reorder the
// picker.

import { createX01 } from './x01/game.js';
import { createX01Panel } from './x01/panel.js';
import { createX01Setup } from './x01/setup.js';
import { meta as x01Meta } from './x01/meta.js';

import { createAroundTheClock } from './around-the-clock/game.js';
import { createAroundTheClockPanel } from './around-the-clock/panel.js';
import { createAroundTheClockSetup } from './around-the-clock/setup.js';
import { meta as aroundTheClockMeta } from './around-the-clock/meta.js';

import { createCatAndMouse } from './cat-and-mouse/game.js';
import { createCatAndMousePanel } from './cat-and-mouse/panel.js';
import { createCatAndMouseSetup } from './cat-and-mouse/setup.js';
import { meta as catAndMouseMeta } from './cat-and-mouse/meta.js';

import { createSimonSays } from './simon-says/game.js';
import { createSimonSaysPanel } from './simon-says/panel.js';
import { createSimonSaysSetup } from './simon-says/setup.js';
import { meta as simonSaysMeta } from './simon-says/meta.js';

import { createCountUp } from './count-up/game.js';
import { createCountUpPanel } from './count-up/panel.js';
import { createCountUpSetup } from './count-up/setup.js';
import { meta as countUpMeta } from './count-up/meta.js';

import { createScoreRush } from './score-rush/game.js';
import { createScoreRushPanel } from './score-rush/panel.js';
import { createScoreRushSetup } from './score-rush/setup.js';
import { meta as scoreRushMeta } from './score-rush/meta.js';

import { createCricket } from './cricket/game.js';
import { createCricketPanel } from './cricket/panel.js';
import { createCricketSetup } from './cricket/setup.js';
import { meta as cricketMeta } from './cricket/meta.js';

import { createShanghai } from './shanghai/game.js';
import { createShanghaiPanel } from './shanghai/panel.js';
import { createShanghaiSetup } from './shanghai/setup.js';
import { meta as shanghaiMeta } from './shanghai/meta.js';

import { createScram } from './scram/game.js';
import { createScramPanel } from './scram/panel.js';
import { createScramSetup } from './scram/setup.js';
import { meta as scramMeta } from './scram/meta.js';

import { createHalfIt } from './half-it/game.js';
import { createHalfItPanel } from './half-it/panel.js';
import { createHalfItSetup } from './half-it/setup.js';
import { meta as halfItMeta } from './half-it/meta.js';

import { createBobs27 } from './bobs-27/game.js';
import { createBobs27Panel } from './bobs-27/panel.js';
import { createBobs27Setup } from './bobs-27/setup.js';
import { meta as bobs27Meta } from './bobs-27/meta.js';

import { createKiller } from './killer/game.js';
import { createKillerPanel } from './killer/panel.js';
import { createKillerSetup } from './killer/setup.js';
import { meta as killerMeta } from './killer/meta.js';

// Ordered list of every game. Order = recommended play order, gentlest first;
// it is the order the picker renders games in.
export const GAMES = [
    {
        type: 'count-up',
        label: 'Count Up',
        createGame: createCountUp,
        createPanel: createCountUpPanel,
        createSetup: createCountUpSetup,
        meta: countUpMeta,
    },
    {
        type: 'simon-says',
        label: 'Simon Says',
        createGame: createSimonSays,
        createPanel: createSimonSaysPanel,
        createSetup: createSimonSaysSetup,
        meta: simonSaysMeta,
    },
    {
        type: 'around-the-clock',
        label: 'Around the Clock',
        createGame: createAroundTheClock,
        createPanel: createAroundTheClockPanel,
        createSetup: createAroundTheClockSetup,
        meta: aroundTheClockMeta,
    },
    {
        type: 'score-rush',
        label: 'Score Rush',
        createGame: createScoreRush,
        createPanel: createScoreRushPanel,
        createSetup: createScoreRushSetup,
        meta: scoreRushMeta,
    },
    {
        type: 'half-it',
        label: 'Half It',
        createGame: createHalfIt,
        createPanel: createHalfItPanel,
        createSetup: createHalfItSetup,
        meta: halfItMeta,
    },
    {
        type: 'shanghai',
        label: 'Shanghai',
        createGame: createShanghai,
        createPanel: createShanghaiPanel,
        createSetup: createShanghaiSetup,
        meta: shanghaiMeta,
    },
    {
        type: 'cat-and-mouse',
        label: 'Cat and Mouse',
        createGame: createCatAndMouse,
        createPanel: createCatAndMousePanel,
        createSetup: createCatAndMouseSetup,
        meta: catAndMouseMeta,
    },
    {
        type: 'cricket',
        label: 'Cricket',
        createGame: createCricket,
        createPanel: createCricketPanel,
        createSetup: createCricketSetup,
        meta: cricketMeta,
    },
    {
        type: 'x01',
        label: 'X01',
        createGame: createX01,
        createPanel: createX01Panel,
        createSetup: createX01Setup,
        meta: x01Meta,
    },
    {
        type: 'bobs-27',
        label: "Bob's 27",
        createGame: createBobs27,
        createPanel: createBobs27Panel,
        createSetup: createBobs27Setup,
        meta: bobs27Meta,
    },
    {
        type: 'scram',
        label: 'Scram',
        createGame: createScram,
        createPanel: createScramPanel,
        createSetup: createScramSetup,
        meta: scramMeta,
    },
    {
        type: 'killer',
        label: 'Killer',
        createGame: createKiller,
        createPanel: createKillerPanel,
        createSetup: createKillerSetup,
        meta: killerMeta,
    },
];

// Descriptor lookup by game type; undefined for an unknown type.
export function getGame(type) {
    return GAMES.find((game) => game.type === type);
}
