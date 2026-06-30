// Dartboard geometry and SVG path generation

// Standard dartboard order (clockwise from top)
export const BOARD_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

// Radii (proportional to standard dartboard dimensions in mm)
export const RADII = {
    BOARD: 170,
    DOUBLE_OUTER: 170,
    DOUBLE_INNER: 162,
    SINGLE_OUTER_OUTER: 162,
    SINGLE_OUTER_INNER: 107,
    TRIPLE_OUTER: 107,
    TRIPLE_INNER: 99,
    SINGLE_INNER_OUTER: 99,
    SINGLE_INNER_INNER: 16,
    BULL_OUTER: 16,
    BULL_INNER: 6.35,
};

// Each segment spans 18 degrees
const SEGMENT_ANGLE = 360 / 20;

// Board colour themes. Each segment is tagged with a colour ROLE (below); a
// theme maps roles → fills, so the board can be re-coloured at runtime.
// Roles: singleEven/singleOdd (the single beds), multiEven/multiOdd (the
// double + treble rings), bullOuter/bullInner.
// A theme maps colour roles → fills, plus the bezel (board border) and number
// colour. Colours sampled from Granboard product photos.
export const BOARD_THEMES = {
    standard: {
        label: 'Standard (green / red)',
        singleEven: '#1a1a1a', singleOdd: '#f5deb3',
        multiEven: '#e8113a', multiOdd: '#00963f',
        bullOuter: '#00963f', bullInner: '#e8113a',
        bezel: '#2d2d2d', numberColor: '#ffffff',
    },
    bluered: {
        // GRANBOARD3s blue: black/white beds, red + deep royal-blue rings
        label: 'Blue / red',
        singleEven: '#1a1a1a', singleOdd: '#ececec',
        multiEven: '#c41e30', multiOdd: '#22479b',
        bullOuter: '#22479b', bullInner: '#c41e30',
        bezel: '#2d2d2d', numberColor: '#ffffff',
    },
    white: {
        // GRANBOARD3s white: same beds/rings as blue, but a white border
        label: 'White (blue / red)',
        singleEven: '#1a1a1a', singleOdd: '#ececec',
        multiEven: '#c41e30', multiOdd: '#22479b',
        bullOuter: '#22479b', bullInner: '#c41e30',
        bezel: '#f0f0f0', numberColor: '#1f1f1f',
    },
};

export const DEFAULT_BOARD_THEME = 'standard';

// Colour role for a numbered segment at the given clockwise position.
function segmentRoles(posIndex) {
    return {
        single: posIndex % 2 === 0 ? 'singleEven' : 'singleOdd',
        multi: posIndex % 2 === 0 ? 'multiEven' : 'multiOdd',
    };
}

// Convert degrees to radians. 0° = top (12 o'clock), clockwise positive.
function toRad(deg) {
    return ((deg - 90) * Math.PI) / 180;
}

// Generate SVG path for an annular sector
function arcPath(cx, cy, rOuter, rInner, startDeg, endDeg) {
    const a1 = toRad(startDeg);
    const a2 = toRad(endDeg);
    const largeArc = endDeg - startDeg > 180 ? 1 : 0;

    const ox1 = cx + rOuter * Math.cos(a1);
    const oy1 = cy + rOuter * Math.sin(a1);
    const ox2 = cx + rOuter * Math.cos(a2);
    const oy2 = cy + rOuter * Math.sin(a2);
    const ix2 = cx + rInner * Math.cos(a2);
    const iy2 = cy + rInner * Math.sin(a2);
    const ix1 = cx + rInner * Math.cos(a1);
    const iy1 = cy + rInner * Math.sin(a1);

    return [
        `M ${ox1} ${oy1}`,
        `A ${rOuter} ${rOuter} 0 ${largeArc} 1 ${ox2} ${oy2}`,
        `L ${ix2} ${iy2}`,
        `A ${rInner} ${rInner} 0 ${largeArc} 0 ${ix1} ${iy1}`,
        'Z',
    ].join(' ');
}

// Generate all segments as descriptors for the dartboard renderer
export function generateSegments(cx, cy) {
    const segments = [];
    const theme = BOARD_THEMES[DEFAULT_BOARD_THEME]; // initial fills; recoloured via colorRole

    for (let i = 0; i < 20; i++) {
        const num = BOARD_ORDER[i];
        const startDeg = i * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
        const endDeg = startDeg + SEGMENT_ANGLE;
        const roles = segmentRoles(i);

        // Double ring
        segments.push({
            id: `d-${num}`,
            ring: 'D',
            segment: num,
            path: arcPath(cx, cy, RADII.DOUBLE_OUTER, RADII.DOUBLE_INNER, startDeg, endDeg),
            colorRole: roles.multi,
            fill: theme[roles.multi],
        });

        // Single outer
        segments.push({
            id: `so-${num}`,
            ring: 'SO',
            segment: num,
            path: arcPath(cx, cy, RADII.SINGLE_OUTER_OUTER, RADII.SINGLE_OUTER_INNER, startDeg, endDeg),
            colorRole: roles.single,
            fill: theme[roles.single],
        });

        // Triple ring
        segments.push({
            id: `t-${num}`,
            ring: 'T',
            segment: num,
            path: arcPath(cx, cy, RADII.TRIPLE_OUTER, RADII.TRIPLE_INNER, startDeg, endDeg),
            colorRole: roles.multi,
            fill: theme[roles.multi],
        });

        // Single inner
        segments.push({
            id: `si-${num}`,
            ring: 'SI',
            segment: num,
            path: arcPath(cx, cy, RADII.SINGLE_INNER_OUTER, RADII.SINGLE_INNER_INNER, startDeg, endDeg),
            colorRole: roles.single,
            fill: theme[roles.single],
        });
    }

    // Outer bull (single bull)
    segments.push({
        id: 'sbull',
        ring: 'SBULL',
        segment: 25,
        circle: { cx, cy, r: RADII.BULL_OUTER },
        colorRole: 'bullOuter',
        fill: theme.bullOuter,
    });

    // Inner bull (double bull / bullseye)
    segments.push({
        id: 'dbull',
        ring: 'DBULL',
        segment: 50,
        circle: { cx, cy, r: RADII.BULL_INNER },
        colorRole: 'bullInner',
        fill: theme.bullInner,
    });

    return segments;
}

// Generate number label positions (just outside the double ring)
export function generateLabels(cx, cy) {
    const labelRadius = RADII.BOARD + 12;
    return BOARD_ORDER.map((num, i) => {
        const deg = i * SEGMENT_ANGLE;
        const rad = toRad(deg);
        return {
            num,
            x: cx + labelRadius * Math.cos(rad),
            y: cy + labelRadius * Math.sin(rad),
        };
    });
}

// Simulated LED ring — an annular band of per-number arcs around the scoring
// area, reaching out toward the bezel where the LEDs sit. With a radial
// gradient (bright outer, fading inward) + blur, this mimics the physical
// board's acrylic-diffused RGB ring.
export const LED_RING = { inner: RADII.BOARD - 2, outer: RADII.BOARD + 22 };

export function generateLedArcs(cx, cy) {
    const pad = 0.75; // shrink each arc so adjacent LEDs leave a small dark gap
    return BOARD_ORDER.map((num, i) => {
        const startDeg = i * SEGMENT_ANGLE - SEGMENT_ANGLE / 2 + pad;
        const endDeg = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - pad;
        return { num, path: arcPath(cx, cy, LED_RING.outer, LED_RING.inner, startDeg, endDeg) };
    });
}
