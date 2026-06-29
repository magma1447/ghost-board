// Target-segment LED highlighting for target-based games.
//
// Lights up the current target segment(s) in green after a short delay. The
// delay lets the hit flash animation play first (typically 800ms after a dart,
// 1000ms after a switch). Supports single-target games (Around the Clock, Cat
// and Mouse via player.currentTarget) and multi-target games (Simon Says via
// state.targetSegments).

import { showSegment as ledShowSegment, showSegments as ledShowSegments, allOff as ledsAllOff } from './leds.js';
import { LED_COLOR } from './protocol.js';

let targetLedTimeout = null;

export function showTargetLed(state, delayMs) {
    clearTimeout(targetLedTimeout);
    if (state.isGameOver) {
        return;
    }

    // Games with explicit segment targets (Simon Says targets, X01 checkout
    // numbers). An empty list means there's nothing to aim at right now, so
    // clear the ring rather than leaving stale segments lit.
    if (state.targetSegments) {
        const segments = state.targetSegments;
        targetLedTimeout = setTimeout(() => {
            if (segments.length > 0) {
                ledShowSegments(segments, LED_COLOR.GREEN);
            } else {
                ledsAllOff();
            }
        }, delayMs);
        return;
    }

    // Single target: light up the current player's target (Around the Clock,
    // Cat and Mouse). Bull (target > 20) has no ring LED.
    const player = state.players[state.currentPlayerIndex];
    if (!player || !player.currentTarget || player.currentTarget > 20) {
        return;
    }
    targetLedTimeout = setTimeout(() => {
        ledShowSegment(player.currentTarget, LED_COLOR.GREEN);
    }, delayMs);
}
