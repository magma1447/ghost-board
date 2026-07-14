// Around the Clock — AI aim strategy.
//
// Aim the current target at the ring its hit-mode needs (shared hitModeAim,
// incl. the multi-step treble gamble); the bull finish (target 21) is this
// game's own special case.

import { RING_RADIUS, hitModeAim } from '../../ai/scatter.js';

export function aroundTheClockAim(state, profile) {
    const target = state.players[state.currentPlayerIndex].currentTarget;
    if (target === 21) {
        return { segment: 25, radius: RING_RADIUS.bull }; // bull finish
    }
    const { hitMode, multiStep } = state.options;
    return hitModeAim(target, hitMode, { multiStep, profile });
}
