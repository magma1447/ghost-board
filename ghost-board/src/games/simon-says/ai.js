// Simon Says — AI aim: an unhit target from the round's 3-number sequence, at
// the ring the hit-mode wants (the ring doesn't affect the score, only the
// hit — so 'any' aims the fat single, the easiest to land).
import { RING_RADIUS } from '../../ai/scatter.js';

export function simonSaysAim(state) {
    const idx = state.targetsHit.findIndex((hit) => !hit);
    const segment = state.sequence[idx < 0 ? 0 : idx];
    const { hitMode } = state.options;
    if (hitMode === 'doubles') {
        return { segment, radius: RING_RADIUS.double };
    }
    if (hitMode === 'trebles') {
        return { segment, radius: RING_RADIUS.treble };
    }
    return { segment, radius: RING_RADIUS.any };
}
