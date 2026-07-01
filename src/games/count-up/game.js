// Count Up — accumulate points over a fixed number of rounds; the highest
// total wins. No bust, no checkout, no target. Built on the shared
// score-accumulation engine with the round-limited end condition.

import { createScoreGame } from '../score-engine.js';

export function createCountUp(opts = {}) {
    return createScoreGame({ ...opts, type: 'count-up', endMode: 'rounds' });
}
