// Cat and Mouse — AI aim: the current target segment at the ring its hit-mode
// needs. With multi-step, a treble jumps three targets (risky) vs a single's one
// (safe) — confident AIs go for the treble. (Mirrors the Around the Clock aim.)
import { RING_RADIUS, takesRisk } from '../../ai/scatter.js';

export function catAndMouseAim(state, profile) {
    const target = state.players[state.currentPlayerIndex].currentTarget;
    const { hitMode, multiStep } = state.options;
    if (hitMode === 'doubles') {
        return { segment: target, radius: RING_RADIUS.double };
    }
    if (hitMode === 'trebles') {
        return { segment: target, radius: RING_RADIUS.treble };
    }
    if (multiStep && takesRisk(profile)) {
        return { segment: target, radius: RING_RADIUS.treble };
    }
    return { segment: target, radius: RING_RADIUS.any };
}
