// Score Rush — race to a target score; first to reach it wins (no exact
// finish, unlike X01). Also known as High Score. Built on the shared
// score-accumulation engine with the target end condition.

import { createScoreGame } from '../score-engine.js';

export function createScoreRush(opts = {}) {
    return createScoreGame({ ...opts, type: 'score-rush', endMode: 'target' });
}
