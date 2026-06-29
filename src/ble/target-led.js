// Target-segment LED highlighting for target-based games.
//
// Lights up the current target segment(s) in green after a short delay. The
// delay lets the hit flash animation play first (typically 800ms after a dart,
// 1000ms after a switch). Supports single-target games (Around the Clock, Cat
// and Mouse via player.currentTarget) and multi-target games (Simon Says via
// state.targetSegments).

import { showSegment as ledShowSegment, showSegments as ledShowSegments } from './leds.js';
import { LED_COLOR } from './protocol.js';

let targetLedTimeout = null;

export function showTargetLed(state, delayMs) {
    clearTimeout(targetLedTimeout);
    if (state.isGameOver) {
        return;
    }

    // Multi-target: light up all remaining targets (Simon Says)
    if (state.targetSegments && state.targetSegments.length > 0) {
        targetLedTimeout = setTimeout(() => {
            ledShowSegments(state.targetSegments, LED_COLOR.GREEN);
        }, delayMs);
        return;
    }

    // Single target: light up the current player's target
    const player = state.players[state.currentPlayerIndex];
    if (!player || !player.currentTarget || player.currentTarget > 20) {
        return;
    }
    targetLedTimeout = setTimeout(() => {
        ledShowSegment(player.currentTarget, LED_COLOR.GREEN);
    }, delayMs);
}
