// Spoken callout scheduler.
//
// Games return callout arrays from onDart() and nextPlayer(); processCallouts()
// schedules them as timed speech events, respecting user settings. Each callout
// has a type and a numeric value to speak. The vocabulary — one type per meaning:
//   'turnTotal'  — points scored this turn (end of round). Gated by Call turn total.
//   'remaining'  — a score you track: points left, or a running total (end of a
//                  turn) / the incoming player's score (start). Chime, then number.
//                  Gated by Call remaining.
//   'target'     — the number you're aiming at (start of round / next-target
//                  prompt). Its own cue (playTargetCue), distinct from the score
//                  chime. Shares the Call remaining toggle.
//   'eliminated' — a player knocked out: a loss sting instead of a spoken score.
//                  Shares the Call remaining toggle.
//   'checkout'   — X01 finishable-score prompt. Gated by Call checkout.
//
// Timing: same-type callouts flow at base spacing (e.g. a Simon target sequence);
// a different type gets an extra gap so they don't blend. A new dart cancels any
// pending callouts to avoid overlap.

import { settings } from '../state/settings.js';
import { playChime, playTargetCue, speakScore, playLost } from './sounds.js';

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
    let prevType = null; // last emitted callout type, for cross-type spacing

    for (const c of callouts) {
        // The round hand-off callouts — a leaving player's running total
        // ('remaining'), their knock-out sting ('eliminated'), and the incoming
        // player's target number ('target') — share the 'remaining' toggle and
        // the same spacing.
        const roundHandoff = c.type === 'remaining' || c.type === 'eliminated' || c.type === 'target';

        // Skip callout types the user has disabled in settings
        if (c.type === 'turnTotal' && !audio.callTurnTotal) {
            continue;
        }
        if (roundHandoff && !audio.callRemaining) {
            continue;
        }
        if (c.type === 'checkout' && !audio.callCheckout) {
            continue;
        }

        // Add a pause before a hand-off callout only when it follows a DIFFERENT
        // callout type (e.g. turn total → remaining — need a gap so they don't
        // blend). Consecutive same-type callouts — a Simon target sequence — flow
        // at the base spacing.
        const sameAsPrev = prevType === c.type;
        prevType = c.type;
        if (roundHandoff && delay > 0 && !sameAsPrev) {
            delay += 1000;
        }

        // A knocked-out player gets the loss sting instead of a spoken total.
        if (c.type === 'eliminated') {
            pendingCallouts.push(setTimeout(() => playLost(), delay));
            delay += 1500;
            continue;
        }

        // A score ('remaining') gets the chime; a 'target' gets its own cue —
        // once, at the head of a target run, so a Simon sequence flows after it.
        if (c.type === 'remaining') {
            pendingCallouts.push(setTimeout(() => playChime(), delay));
            delay += 400;
        } else if (c.type === 'target' && !sameAsPrev) {
            pendingCallouts.push(setTimeout(() => playTargetCue(), delay));
            delay += 400;
        }

        const d = delay;
        // The "180!" shout is only for a turn total of 180, not e.g. 180 left.
        const emphatic = c.type === 'turnTotal';
        pendingCallouts.push(setTimeout(() => speakScore(c.value, { emphatic }), d));
        delay += 1500;
    }
}
