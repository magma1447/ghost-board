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
// are gut-feel starting values and WILL need a lot of play-testing. Custom
// profiles later — see #68.

import { BOARD_ORDER, RADII } from '../board/segments.js';

// level → skill constants.
//   scatterH/V   std-dev of aim error (mm); horizontal tighter than vertical
//                (elbow geometry vs release timing).
//   fumbleChance per-dart chance of a gross throw.
//   fumbleScatter how much wider that throw spreads.
const AI_PROFILES = {
    1: { scatterH: 34, scatterV: 55, fumbleChance: 0.06, fumbleScatter: 3.0 },
    2: { scatterH: 30, scatterV: 48, fumbleChance: 0.05, fumbleScatter: 3.0 },
    3: { scatterH: 26, scatterV: 42, fumbleChance: 0.045, fumbleScatter: 3.0 },
    4: { scatterH: 23, scatterV: 36, fumbleChance: 0.04, fumbleScatter: 3.2 },
    5: { scatterH: 19, scatterV: 30, fumbleChance: 0.035, fumbleScatter: 3.2 },
    6: { scatterH: 16, scatterV: 25, fumbleChance: 0.03, fumbleScatter: 3.3 },
    7: { scatterH: 13, scatterV: 20, fumbleChance: 0.025, fumbleScatter: 3.5 },
    8: { scatterH: 10, scatterV: 15, fumbleChance: 0.02, fumbleScatter: 3.5 },
    9: { scatterH: 6, scatterV: 10, fumbleChance: 0.012, fumbleScatter: 4.0 },
    10: { scatterH: 0, scatterV: 0, fumbleChance: 0, fumbleScatter: 0 },
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

// Around the Clock: aim the current target at the ring its hit-mode needs.
function aroundTheClockAim(state) {
    const target = state.players[state.currentPlayerIndex].currentTarget;
    if (target === 21) {
        return { segment: 25, radius: RING_RADIUS.bull }; // bull finish
    }
    const { hitMode } = state.options;
    const key = hitMode === 'doubles' ? 'double' : hitMode === 'trebles' ? 'treble' : 'any';
    return { segment: target, radius: RING_RADIUS[key] };
}

const STRATEGIES = {
    'around-the-clock': aroundTheClockAim,
};

// One AI dart: the scored { ring, segment } plus the aim and landing points
// (board coords) for the debug overlay.
export function aiThrow(gameType, state, level) {
    const profile = AI_PROFILES[level] || AI_PROFILES[5];
    const strategy = STRATEGIES[gameType];
    const aim = strategy ? strategy(state) : { segment: 25, radius: RING_RADIUS.bull };

    const aimXY = aimPoint(aim.segment, aim.radius);
    const spread = Math.random() < profile.fumbleChance ? profile.fumbleScatter : 1;
    const land = {
        x: aimXY.x + gaussian() * profile.scatterH * spread,
        y: aimXY.y + gaussian() * profile.scatterV * spread,
    };
    return { ...pointToHit(land.x, land.y), aim: aimXY, land };
}
