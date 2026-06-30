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
// colour. The four themes mirror the four LED-equipped Granboard products;
// colours sampled from their product photos.
export const BOARD_THEMES = {
    green: {
        // GRANBOARD3s Green: black/white beds, red + green rings
        label: 'Green / red (3S)',
        singleEven: '#1a1a1a', singleOdd: '#ececec',
        multiEven: '#c41e30', multiOdd: '#1f9b4e',
        bullOuter: '#1f9b4e', bullInner: '#c41e30',
        bezel: '#2d2d2d', numberColor: '#ffffff',
        ledPad: 0.6, ledOpacity: { inner: 0, outer: 0.95 },
    },
    blue: {
        // GRANBOARD3s Blue: black/white beds, red + deep royal-blue rings
        label: 'Blue / red (3S)',
        singleEven: '#1a1a1a', singleOdd: '#ececec',
        multiEven: '#c41e30', multiOdd: '#22479b',
        bullOuter: '#22479b', bullInner: '#c41e30',
        bezel: '#2d2d2d', numberColor: '#ffffff',
        ledPad: 0.6, ledOpacity: { inner: 0, outer: 0.95 },
    },
    white: {
        // GRANBOARD3s White: same beds/rings as blue, but a white border
        label: 'White (3S)',
        singleEven: '#1a1a1a', singleOdd: '#ececec',
        multiEven: '#c41e30', multiOdd: '#22479b',
        bullOuter: '#22479b', bullInner: '#c41e30',
        bezel: '#f0f0f0', numberColor: '#1f1f1f',
        // Brighter LEDs: a white border washes out semi-transparent colour.
        ledPad: 0.6, ledOpacity: { inner: 0.3, outer: 1 },
    },
    gran132: {
        // GRANBOARD132 White: red/blue beds (same hues as the White 3S) with
        // the rings in the opposite colour, on a white border (European style)
        label: 'Granboard 132',
        singleEven: '#22479b', singleOdd: '#c41e30',
        multiEven: '#c41e30', multiOdd: '#22479b',
        bullOuter: '#c41e30', bullInner: '#22479b',
        bezel: '#f0f0f0', numberColor: '#1f1f1f',
        ledPad: 0.6, ledOpacity: { inner: 0.3, outer: 1 },
    },
};

export const DEFAULT_BOARD_THEME = 'green';

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

export function generateLedArcs(cx, cy, pad = 0.75) {
    // pad shrinks each arc so adjacent LEDs leave a small dark gap; lower pad =
    // wider, brighter-looking arcs. Tuned per theme (see BOARD_THEMES.ledPad).
    return BOARD_ORDER.map((num, i) => {
        const startDeg = i * SEGMENT_ANGLE - SEGMENT_ANGLE / 2 + pad;
        const endDeg = i * SEGMENT_ANGLE + SEGMENT_ANGLE / 2 - pad;
        return { num, path: arcPath(cx, cy, LED_RING.outer, LED_RING.inner, startDeg, endDeg) };
    });
}
