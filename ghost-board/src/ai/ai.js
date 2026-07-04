// AI opponent throw engine — a board-scatter accuracy model.
//
// Each dart: the aim layer (per game) picks a point on the board; the scatter
// layer (shared) adds a 2-D Gaussian around it — separate horizontal/vertical
// spread plus a rare wider "fumble" — and reads where it actually landed off the
// real board geometry. Genuine misses (OUT) fall out naturally.
//
// Constants live in per-level profiles. Units are board units, which happen to
// equal millimetres on a standard board (RADII.BOARD = 170 = a 13" board's
// double-ring radius in mm). Level 10 is flawless (zero scatter/fumble). These
// are gut-feel starting values and WILL need a lot of play-testing; the target
// each level should hit is the calibration brief in this directory's README.md.
// Custom profiles later — see #68.

import { BOARD_ORDER, RADII } from '../board/segments.js';

// level → skill constants.
//   scatterHorizontal/Vertical  std-dev of aim error (mm); horizontal tighter
//                than vertical (elbow geometry vs release timing).
//   fumbleChance per-dart chance of a wider "spray" throw — the fat tail on the
//                Gaussian core (i.e. how non-Gaussian the misses are).
//   fumbleScatter how much wider that spray is (multiplies the core spread).
//   confidence   mean risk appetite (0–1): willingness to take the fast-but-hard
//                line over the slow-but-safe one. Independent of scatter.
//   confidenceVariance  per-decision noise on that appetite — wide for low
//                levels (erratic) down to ~0 for pros (consistent).
const AI_PROFILES = {
    1: { scatterHorizontal: 60, scatterVertical: 46, fumbleChance: 0.10, fumbleScatter: 2.2, confidence: 0.30, confidenceVariance: 0.35 },
    2: { scatterHorizontal: 53, scatterVertical: 42, fumbleChance: 0.09, fumbleScatter: 2.2, confidence: 0.36, confidenceVariance: 0.32 },
    3: { scatterHorizontal: 46, scatterVertical: 38, fumbleChance: 0.08, fumbleScatter: 2.2, confidence: 0.42, confidenceVariance: 0.28 },
    4: { scatterHorizontal: 39, scatterVertical: 33, fumbleChance: 0.07, fumbleScatter: 2.2, confidence: 0.48, confidenceVariance: 0.24 },
    5: { scatterHorizontal: 32, scatterVertical: 29, fumbleChance: 0.06, fumbleScatter: 2.1, confidence: 0.55, confidenceVariance: 0.20 },
    6: { scatterHorizontal: 25, scatterVertical: 24, fumbleChance: 0.05, fumbleScatter: 2.1, confidence: 0.62, confidenceVariance: 0.16 },
    7: { scatterHorizontal: 19, scatterVertical: 20, fumbleChance: 0.04, fumbleScatter: 2.1, confidence: 0.70, confidenceVariance: 0.12 },
    8: { scatterHorizontal: 15, scatterVertical: 17, fumbleChance: 0.03, fumbleScatter: 2.0, confidence: 0.78, confidenceVariance: 0.08 },
    9: { scatterHorizontal: 8, scatterVertical: 11, fumbleChance: 0.02, fumbleScatter: 2.0, confidence: 0.88, confidenceVariance: 0.04 },
    10: { scatterHorizontal: 0, scatterVertical: 0, fumbleChance: 0, fumbleScatter: 0, confidence: 1.0, confidenceVariance: 0 },
};

// Standard-normal sample (Box–Muller).
function gaussian() {
    let u1 = Math.random();
    const u2 = Math.random();
    if (u1 < 1e-9) {
        u1 = 1e-9;
    }
    return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

// Board point (relative to centre) for segment N at a given radius. 0° = top,
// clockwise — matching segments.js.
function aimPoint(segment, radius) {
    const idx = Math.max(0, BOARD_ORDER.indexOf(segment));
    const rad = ((idx * 18 - 90) * Math.PI) / 180;
    return { x: radius * Math.cos(rad), y: radius * Math.sin(rad) };
}

// Where a landing point actually scored, read off the real geometry.
function pointToHit(x, y) {
    const r = Math.hypot(x, y);
    if (r > RADII.DOUBLE_OUTER) {
        return { ring: 'OUT', segment: 0 };
    }
    if (r <= RADII.BULL_INNER) {
        return { ring: 'DBULL', segment: 50 };
    }
    if (r <= RADII.BULL_OUTER) {
        return { ring: 'SBULL', segment: 25 };
    }
    let deg = (Math.atan2(y, x) * 180) / Math.PI + 90;
    deg = ((deg % 360) + 360) % 360;
    const segment = BOARD_ORDER[Math.round(deg / 18) % 20];
    let ring;
    if (r <= RADII.SINGLE_INNER_OUTER) {
        ring = 'SI';
    } else if (r <= RADII.TREBLE_OUTER) {
        ring = 'T';
    } else if (r <= RADII.SINGLE_OUTER_OUTER) {
        ring = 'SO';
    } else {
        ring = 'D';
    }
    return { ring, segment };
}

// Centre radius of each ring band, for aiming.
const RING_RADIUS = {
    bull: 0,
    treble: (RADII.TREBLE_INNER + RADII.TREBLE_OUTER) / 2,
    double: (RADII.DOUBLE_INNER + RADII.DOUBLE_OUTER) / 2,
    // "any single": the radial centre of the whole number band — farthest from
    // both the bull and the edge, so most likely to stay on the number.
    any: (RADII.BULL_OUTER + RADII.DOUBLE_OUTER) / 2,
};

// Threshold the aggressive (fast-but-hard) line must clear to be taken.
const RISK_THRESHOLD = 0.5;

// Whether to take the aggressive option. Effective confidence is the profile's
// mean plus per-decision noise — wide for low levels (erratic), ~0 for pros
// (consistent) — so a beginner sometimes over-reaches and a pro reliably makes
// the call.
function takesRisk(profile) {
    return profile.confidence + gaussian() * profile.confidenceVariance >= RISK_THRESHOLD;
}

// Around the Clock: aim the current target at the ring its hit-mode needs. In
// 'any' mode with multi-step, a treble jumps 3 targets (risky) vs a single's 1
// (safe) — confident AIs go for the treble; otherwise the fat single.
function aroundTheClockAim(state, profile) {
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

const STRATEGIES = {
    'around-the-clock': aroundTheClockAim,
};

// One AI dart: the scored { ring, segment } plus the aim and landing points
// (board coords) for the debug overlay.
export function aiThrow(gameType, state, level) {
    const profile = AI_PROFILES[level] || AI_PROFILES[5];
    const strategy = STRATEGIES[gameType];
    const aim = strategy ? strategy(state, profile) : { segment: 25, radius: RING_RADIUS.bull };

    const aimXY = aimPoint(aim.segment, aim.radius);
    const spread = Math.random() < profile.fumbleChance ? profile.fumbleScatter : 1;
    const land = {
        x: aimXY.x + gaussian() * profile.scatterHorizontal * spread,
        y: aimXY.y + gaussian() * profile.scatterVertical * spread,
    };
    return { ...pointToHit(land.x, land.y), aim: aimXY, land };
}
