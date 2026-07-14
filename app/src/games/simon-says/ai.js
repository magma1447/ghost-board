// Simon Says — AI aim: an unhit target from the round's 3-number sequence, at
// the ring the hit-mode wants (shared hitModeAim; the ring doesn't affect the
// score, only the hit — so 'any' aims the fat single, the easiest to land).
import { hitModeAim } from '../../ai/scatter.js';

export function simonSaysAim(state) {
    const idx = state.targetsHit.findIndex((hit) => !hit);
    const segment = state.sequence[idx < 0 ? 0 : idx];
    return hitModeAim(segment, state.options.hitMode);
}
