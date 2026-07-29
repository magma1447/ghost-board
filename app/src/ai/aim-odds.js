// Landing odds + intelligence-scaled expected value for an aim.
//
// Where a dart lands (its scatter spread) depends only on the aim and the skill
// profile, not on the game — so the odds are estimated once per (aim, profile)
// with many samples and cached here. A game's AI supplies a value function (what a
// landed dart is worth on the current board); this returns the expected value of
// aiming there under those cached odds.
//
// Two sample counts, two jobs:
//   - ODDS_SAMPLES: how finely the spread itself is estimated. High, one-time,
//     cached — this is accuracy, and it's independent of skill.
//   - the decision draw (decisionDraws): how many of those odds a player actually
//     weighs before choosing. Scaled by the profile's confidence — few = erratic
//     (low intelligence), many/exact = optimal. Re-rolled every call, so a weak
//     AI's misjudgements vary throw to throw rather than sticking. This is what
//     separates a dart-thrower's *skill* (scatter) from their *judgement*.

import { applyScatter } from './scatter.js';

// Samples used to estimate a spread. One-time per (aim, profile), so we lean high.
const ODDS_SAMPLES = 40000;

// Only a near-flawless judgement reads the odds exactly. Below this, decisions
// carry a little noise — enough that stable value gaps still resolve, but a
// decision that only just flips with skill (e.g. when the bull becomes worth it)
// ramps in smoothly instead of snapping from never to always.
const EXACT_ABOVE = 1500;

// (aim, profile) → [{ ring, segment, prob }], memoised for the process lifetime.
const oddsCache = new Map();

function profileKey(profile) {
    return `${profile.scatterHorizontal},${profile.scatterVertical},${profile.fumbleChance},${profile.fumbleScatter}`;
}

// The landing distribution for an aim under a profile: a sparse list of possible
// { ring, segment } outcomes and their probabilities. Built once, then cached.
function landingOdds(aim, profile) {
    const key = `${profileKey(profile)}|${aim.segment},${aim.radius}`;
    const cached = oddsCache.get(key);
    if (cached) {
        return cached;
    }
    let odds;
    if (profile.scatterHorizontal === 0 && profile.scatterVertical === 0) {
        const hit = applyScatter(aim, profile); // flawless — one certain outcome
        odds = [{ ring: hit.ring, segment: hit.segment, prob: 1 }];
    } else {
        const counts = new Map();
        for (let i = 0; i < ODDS_SAMPLES; i++) {
            const hit = applyScatter(aim, profile);
            const k = `${hit.ring},${hit.segment}`;
            counts.set(k, (counts.get(k) || 0) + 1);
        }
        odds = [];
        for (const [k, n] of counts) {
            const comma = k.indexOf(',');
            odds.push({ ring: k.slice(0, comma), segment: Number(k.slice(comma + 1)), prob: n / ODDS_SAMPLES });
        }
    }
    oddsCache.set(key, odds);
    return odds;
}

// How many of the odds this profile weighs before deciding — its "judgement".
// Climbs steeply with confidence; the mapping is a tunable, the judgement analogue
// of the scatter profile (see the calibration brief in this directory's README).
function decisionDraws(profile) {
    return Math.round(5 + 9000 * profile.confidence ** 5);
}

// Pick one outcome from the odds, weighted by probability.
function drawOutcome(odds) {
    let r = Math.random();
    for (const o of odds) {
        r -= o.prob;
        if (r <= 0) {
            return o;
        }
    }
    return odds[odds.length - 1];
}

// The exact odds that aiming here lands a capture-strength hit (double / treble /
// double-bull) on `targetSegment` — i.e. takes that number in a single dart. Read
// straight off the cached spread, so it's noise-free (a policy input, not a draw).
export function captureChance(aim, profile, targetSegment) {
    let p = 0;
    for (const o of landingOdds(aim, profile)) {
        if (o.segment === targetSegment && (o.ring === 'D' || o.ring === 'T' || o.ring === 'DBULL')) {
            p += o.prob;
        }
    }
    return p;
}

// The exact odds that aiming here lands on the bull at all (single or double bull)
// — the chance of claiming a neutral bull, a hard central target worth gating on.
export function bullHitChance(aim, profile) {
    let p = 0;
    for (const o of landingOdds(aim, profile)) {
        if (o.ring === 'SBULL' || o.ring === 'DBULL') {
            p += o.prob;
        }
    }
    return p;
}

// Expected value of aiming at `aim` for a player of this `profile`, scoring each
// possible landing with `valueFn(ring, segment)`. A sharp profile takes the exact
// expectation over the odds (decisive); a weak one averages just a few draws
// (noisy — it sometimes misjudges which aim is best, differently each time).
export function expectedAimValue(aim, profile, valueFn) {
    const odds = landingOdds(aim, profile);
    if (odds.length === 1) {
        return valueFn(odds[0].ring, odds[0].segment); // certain outcome
    }
    if (decisionDraws(profile) >= EXACT_ABOVE) {
        let ev = 0;
        for (const o of odds) {
            ev += o.prob * valueFn(o.ring, o.segment);
        }
        return ev;
    }
    let sum = 0;
    const draws = decisionDraws(profile);
    for (let i = 0; i < draws; i++) {
        const o = drawOutcome(odds);
        sum += valueFn(o.ring, o.segment);
    }
    return sum / draws;
}
