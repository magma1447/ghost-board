// Cat and Mouse — AI aim: the current target segment at the ring its hit-mode
// needs (shared hitModeAim, incl. the multi-step treble gamble).
import { hitModeAim } from '../../ai/scatter.js';

export function catAndMouseAim(state, profile) {
    const target = state.players[state.currentPlayerIndex].currentTarget;
    const { hitMode, multiStep } = state.options;
    return hitModeAim(target, hitMode, { multiStep, profile });
}
