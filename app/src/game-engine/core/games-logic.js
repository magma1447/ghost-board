// UI-free game descriptors — the node-safe half of the registry.
//
// Everything a game needs that doesn't touch the DOM: its factory, meta, option
// schema, and (where supported) AI aim. registry.js imports this and layers the
// panels/setups on top; headless tools (bin/, test/) import it directly, since
// panels pull in CSS/DOM that Node can't load. Keeping this the single source of
// truth means a new game is added in one place and the tests can't miss it.
//
// Order = recommended play order (gentlest first); registry.js and the picker
// preserve it.

import { createCountUp } from '../../games/count-up/game.js';
import { meta as countUpMeta } from '../../games/count-up/meta.js';
import { countUpAim } from '../../games/count-up/ai.js';
import { defaults as countUpDefaults, fields as countUpFields } from '../../games/count-up/options.js';

import { createSimonSays } from '../../games/simon-says/game.js';
import { meta as simonSaysMeta } from '../../games/simon-says/meta.js';
import { simonSaysAim } from '../../games/simon-says/ai.js';
import { defaults as simonSaysDefaults, fields as simonSaysFields } from '../../games/simon-says/options.js';

import { createAroundTheClock } from '../../games/around-the-clock/game.js';
import { meta as aroundTheClockMeta } from '../../games/around-the-clock/meta.js';
import { aroundTheClockAim } from '../../games/around-the-clock/ai.js';
import { defaults as aroundTheClockDefaults, fields as aroundTheClockFields } from '../../games/around-the-clock/options.js';

import { createScoreRush } from '../../games/score-rush/game.js';
import { meta as scoreRushMeta } from '../../games/score-rush/meta.js';
import { scoreRushAim } from '../../games/score-rush/ai.js';
import { defaults as scoreRushDefaults, fields as scoreRushFields } from '../../games/score-rush/options.js';

import { createHalfIt } from '../../games/half-it/game.js';
import { meta as halfItMeta } from '../../games/half-it/meta.js';
import { halfItAim } from '../../games/half-it/ai.js';
import { defaults as halfItDefaults, fields as halfItFields } from '../../games/half-it/options.js';

import { createShanghai } from '../../games/shanghai/game.js';
import { meta as shanghaiMeta } from '../../games/shanghai/meta.js';
import { shanghaiAim } from '../../games/shanghai/ai.js';
import { defaults as shanghaiDefaults, fields as shanghaiFields } from '../../games/shanghai/options.js';

import { createCatAndMouse } from '../../games/cat-and-mouse/game.js';
import { meta as catAndMouseMeta } from '../../games/cat-and-mouse/meta.js';
import { catAndMouseAim } from '../../games/cat-and-mouse/ai.js';
import { defaults as catAndMouseDefaults, fields as catAndMouseFields } from '../../games/cat-and-mouse/options.js';

import { createCricket } from '../../games/cricket/game.js';
import { meta as cricketMeta } from '../../games/cricket/meta.js';
import { defaults as cricketDefaults, fields as cricketFields } from '../../games/cricket/options.js';

import { createAllFives } from '../../games/all-fives/game.js';
import { meta as allFivesMeta } from '../../games/all-fives/meta.js';
import { allFivesAim } from '../../games/all-fives/ai.js';
import { defaults as allFivesDefaults, fields as allFivesFields } from '../../games/all-fives/options.js';

import { createX01 } from '../../games/x01/game.js';
import { meta as x01Meta } from '../../games/x01/meta.js';
import { x01Aim } from '../../games/x01/ai.js';
import { defaults as x01Defaults, fields as x01Fields } from '../../games/x01/options.js';

import { createBobs27 } from '../../games/bobs-27/game.js';
import { meta as bobs27Meta } from '../../games/bobs-27/meta.js';
import { bobs27Aim } from '../../games/bobs-27/ai.js';
import { defaults as bobs27Defaults, fields as bobs27Fields } from '../../games/bobs-27/options.js';

import { createScram } from '../../games/scram/game.js';
import { meta as scramMeta } from '../../games/scram/meta.js';
import { defaults as scramDefaults, fields as scramFields } from '../../games/scram/options.js';

import { createKiller } from '../../games/killer/game.js';
import { meta as killerMeta } from '../../games/killer/meta.js';
import { defaults as killerDefaults, fields as killerFields } from '../../games/killer/options.js';

import { createDomination } from '../../games/domination/game.js';
import { meta as dominationMeta } from '../../games/domination/meta.js';
import { dominationAim } from '../../games/domination/ai.js';
import { defaults as dominationDefaults, fields as dominationFields } from '../../games/domination/options.js';

// Each entry: { type, label, createGame, meta, defaults, fields, aim? }.
// `aim` is present only for games that support AI (see meta.supportsAi).
export const GAME_LOGIC = [
    { type: 'count-up', label: 'Count Up', createGame: createCountUp, meta: countUpMeta, defaults: countUpDefaults, fields: countUpFields, aim: countUpAim },
    { type: 'simon-says', label: 'Simon Says', createGame: createSimonSays, meta: simonSaysMeta, defaults: simonSaysDefaults, fields: simonSaysFields, aim: simonSaysAim },
    { type: 'around-the-clock', label: 'Around the Clock', createGame: createAroundTheClock, meta: aroundTheClockMeta, defaults: aroundTheClockDefaults, fields: aroundTheClockFields, aim: aroundTheClockAim },
    { type: 'score-rush', label: 'Score Rush', createGame: createScoreRush, meta: scoreRushMeta, defaults: scoreRushDefaults, fields: scoreRushFields, aim: scoreRushAim },
    { type: 'half-it', label: 'Half It', createGame: createHalfIt, meta: halfItMeta, defaults: halfItDefaults, fields: halfItFields, aim: halfItAim },
    { type: 'shanghai', label: 'Shanghai', createGame: createShanghai, meta: shanghaiMeta, defaults: shanghaiDefaults, fields: shanghaiFields, aim: shanghaiAim },
    { type: 'cat-and-mouse', label: 'Cat and Mouse', createGame: createCatAndMouse, meta: catAndMouseMeta, defaults: catAndMouseDefaults, fields: catAndMouseFields, aim: catAndMouseAim },
    { type: 'cricket', label: 'Cricket', createGame: createCricket, meta: cricketMeta, defaults: cricketDefaults, fields: cricketFields },
    { type: 'all-fives', label: 'All Fives', createGame: createAllFives, meta: allFivesMeta, defaults: allFivesDefaults, fields: allFivesFields, aim: allFivesAim },
    { type: 'x01', label: 'X01', createGame: createX01, meta: x01Meta, defaults: x01Defaults, fields: x01Fields, aim: x01Aim },
    { type: 'bobs-27', label: "Bob's 27", createGame: createBobs27, meta: bobs27Meta, defaults: bobs27Defaults, fields: bobs27Fields, aim: bobs27Aim },
    { type: 'scram', label: 'Scram', createGame: createScram, meta: scramMeta, defaults: scramDefaults, fields: scramFields },
    { type: 'killer', label: 'Killer', createGame: createKiller, meta: killerMeta, defaults: killerDefaults, fields: killerFields },
    { type: 'domination', label: 'Domination', createGame: createDomination, meta: dominationMeta, defaults: dominationDefaults, fields: dominationFields, aim: dominationAim },
];
