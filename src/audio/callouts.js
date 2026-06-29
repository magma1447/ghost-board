// Spoken callout scheduler.
//
// Games return callout arrays from onDart() and nextPlayer(). Each callout has
// a type ('turnTotal', 'remaining', 'checkout') and a numeric value to speak.
// processCallouts() schedules them as timed speech events, respecting user
// settings.
//
// Timing sequence for a player switch with turn total enabled:
//   0ms:    speak turn total (e.g. "sixty")
//   1500ms: extra gap before remaining score
//   2500ms: play chime
//   2900ms: speak remaining (e.g. "three oh one")
//
// Each new dart cancels any pending callouts to avoid overlap.

import { settings } from '../state/settings.js';
import { playChime, speakScore } from './sounds.js';

const pendingCallouts = [];

export function processCallouts(callouts) {
    if (!callouts || callouts.length === 0) {
        return;
    }

    // Cancel any in-flight callouts from the previous dart
    for (const id of pendingCallouts) {
        clearTimeout(id);
    }
    pendingCallouts.length = 0;
    if (window.speechSynthesis) {
        window.speechSynthesis.cancel();
    }

    const audio = settings().audio;
    let delay = 0;

    for (const c of callouts) {
    // Skip callout types the user has disabled in settings
        if (c.type === 'turnTotal' && !audio.callTurnTotal) {
            continue;
        }
        if (c.type === 'remaining' && !audio.callRemaining) {
            continue;
        }
        if (c.type === 'checkout' && !audio.callCheckout) {
            continue;
        }

        // Add a pause before 'remaining' if a previous callout was already queued
        // (e.g. turn total was spoken first — need a gap so they don't blend)
        if (c.type === 'remaining' && delay > 0) {
            delay += 1000;
        }

        // 'remaining' callouts get a chime sound before the spoken number
        if (c.type === 'remaining') {
            pendingCallouts.push(setTimeout(() => playChime(), delay));
            delay += 400;
        }

        const d = delay;
        pendingCallouts.push(setTimeout(() => speakScore(c.value), d));
        delay += 1500;
    }
}
