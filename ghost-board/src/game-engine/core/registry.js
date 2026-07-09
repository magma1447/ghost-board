// Game registry — the single ordered source of truth for every game.
//
// Each descriptor bundles everything the app needs for a game type: its label,
// its factory functions (createGame / createPanel / createSetup), its meta
// (short synopsis, option blurbs, player range, difficulty ratings, tags), and
// — for games that support AI — an `aim` strategy (src/games/<game>/ai.js) the
// scatter engine reads. Consumers (manager.js, game-controller.js, ai/ai.js)
// derive their per-game maps from this array instead of maintaining parallel ones.
//
// The array order IS the recommended play order — gentlest first — and drives
// the order games appear in the picker. Reorder entries here to reorder the
// picker.

import { createX01 } from '../../games/x01/game.js';
import { createX01Panel } from '../../games/x01/panel.js';
import { createX01Setup } from '../../games/x01/setup.js';
import { meta as x01Meta } from '../../games/x01/meta.js';
import { x01Aim } from '../../games/x01/ai.js';

import { createAroundTheClock } from '../../games/around-the-clock/game.js';
import { createAroundTheClockPanel } from '../../games/around-the-clock/panel.js';
import { createAroundTheClockSetup } from '../../games/around-the-clock/setup.js';
import { meta as aroundTheClockMeta } from '../../games/around-the-clock/meta.js';
import { aroundTheClockAim } from '../../games/around-the-clock/ai.js';

import { createCatAndMouse } from '../../games/cat-and-mouse/game.js';
import { createCatAndMousePanel } from '../../games/cat-and-mouse/panel.js';
import { createCatAndMouseSetup } from '../../games/cat-and-mouse/setup.js';
import { meta as catAndMouseMeta } from '../../games/cat-and-mouse/meta.js';
import { catAndMouseAim } from '../../games/cat-and-mouse/ai.js';

import { createSimonSays } from '../../games/simon-says/game.js';
import { createSimonSaysPanel } from '../../games/simon-says/panel.js';
import { createSimonSaysSetup } from '../../games/simon-says/setup.js';
import { meta as simonSaysMeta } from '../../games/simon-says/meta.js';
import { simonSaysAim } from '../../games/simon-says/ai.js';

import { createCountUp } from '../../games/count-up/game.js';
import { createCountUpPanel } from '../../games/count-up/panel.js';
import { createCountUpSetup } from '../../games/count-up/setup.js';
import { meta as countUpMeta } from '../../games/count-up/meta.js';
import { countUpAim } from '../../games/count-up/ai.js';

import { createScoreRush } from '../../games/score-rush/game.js';
import { createScoreRushPanel } from '../../games/score-rush/panel.js';
import { createScoreRushSetup } from '../../games/score-rush/setup.js';
import { meta as scoreRushMeta } from '../../games/score-rush/meta.js';
import { scoreRushAim } from '../../games/score-rush/ai.js';

import { createCricket } from '../../games/cricket/game.js';
import { createCricketPanel } from '../../games/cricket/panel.js';
import { createCricketSetup } from '../../games/cricket/setup.js';
import { meta as cricketMeta } from '../../games/cricket/meta.js';

import { createShanghai } from '../../games/shanghai/game.js';
import { createShanghaiPanel } from '../../games/shanghai/panel.js';
import { createShanghaiSetup } from '../../games/shanghai/setup.js';
import { meta as shanghaiMeta } from '../../games/shanghai/meta.js';
import { shanghaiAim } from '../../games/shanghai/ai.js';

import { createScram } from '../../games/scram/game.js';
import { createScramPanel } from '../../games/scram/panel.js';
import { createScramSetup } from '../../games/scram/setup.js';
import { meta as scramMeta } from '../../games/scram/meta.js';

import { createHalfIt } from '../../games/half-it/game.js';
import { createHalfItPanel } from '../../games/half-it/panel.js';
import { createHalfItSetup } from '../../games/half-it/setup.js';
import { meta as halfItMeta } from '../../games/half-it/meta.js';
import { halfItAim } from '../../games/half-it/ai.js';

import { createBobs27 } from '../../games/bobs-27/game.js';
import { createBobs27Panel } from '../../games/bobs-27/panel.js';
import { createBobs27Setup } from '../../games/bobs-27/setup.js';
import { meta as bobs27Meta } from '../../games/bobs-27/meta.js';
import { bobs27Aim } from '../../games/bobs-27/ai.js';

import { createKiller } from '../../games/killer/game.js';
import { createKillerPanel } from '../../games/killer/panel.js';
import { createKillerSetup } from '../../games/killer/setup.js';
import { meta as killerMeta } from '../../games/killer/meta.js';

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
        aim: countUpAim,
    },
    {
        type: 'simon-says',
        label: 'Simon Says',
        createGame: createSimonSays,
        createPanel: createSimonSaysPanel,
        createSetup: createSimonSaysSetup,
        meta: simonSaysMeta,
        aim: simonSaysAim,
    },
    {
        type: 'around-the-clock',
        label: 'Around the Clock',
        createGame: createAroundTheClock,
        createPanel: createAroundTheClockPanel,
        createSetup: createAroundTheClockSetup,
        meta: aroundTheClockMeta,
        aim: aroundTheClockAim,
    },
    {
        type: 'score-rush',
        label: 'Score Rush',
        createGame: createScoreRush,
        createPanel: createScoreRushPanel,
        createSetup: createScoreRushSetup,
        meta: scoreRushMeta,
        aim: scoreRushAim,
    },
    {
        type: 'half-it',
        label: 'Half It',
        createGame: createHalfIt,
        createPanel: createHalfItPanel,
        createSetup: createHalfItSetup,
        meta: halfItMeta,
        aim: halfItAim,
    },
    {
        type: 'shanghai',
        label: 'Shanghai',
        createGame: createShanghai,
        createPanel: createShanghaiPanel,
        createSetup: createShanghaiSetup,
        meta: shanghaiMeta,
        aim: shanghaiAim,
    },
    {
        type: 'cat-and-mouse',
        label: 'Cat and Mouse',
        createGame: createCatAndMouse,
        createPanel: createCatAndMousePanel,
        createSetup: createCatAndMouseSetup,
        meta: catAndMouseMeta,
        aim: catAndMouseAim,
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
        aim: x01Aim,
    },
    {
        type: 'bobs-27',
        label: "Bob's 27",
        createGame: createBobs27,
        createPanel: createBobs27Panel,
        createSetup: createBobs27Setup,
        meta: bobs27Meta,
        aim: bobs27Aim,
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
