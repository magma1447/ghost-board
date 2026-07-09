// Around the Clock — AI aim strategy.
//
// Aim the current target at the ring its hit-mode needs. In 'any' mode with
// multi-step, a treble jumps 3 targets (risky) vs a single's 1 (safe) —
// confident AIs go for the treble; otherwise the fat single.

import { RING_RADIUS, takesRisk } from '../../ai/scatter.js';

export function aroundTheClockAim(state, profile) {
    const target = state.players[state.currentPlayerIndex].currentTarget;
    if (target === 21) {
        return { segment: 25, radius: RING_RADIUS.bull }; // bull finish
    }
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
