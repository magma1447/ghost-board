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

// Colors
const COLOR = {
    BLACK: '#1a1a1a',
    CREAM: '#f5deb3',
    RED: '#e8113a',
    GREEN: '#00963f',
    BULL_GREEN: '#00963f',
    BULL_RED: '#e8113a',
    WIRE: '#c0c0c0',
};

function segmentColor(posIndex) {
    // Even positions: black/red, Odd positions: cream/green
    return {
        single: posIndex % 2 === 0 ? COLOR.BLACK : COLOR.CREAM,
        multi: posIndex % 2 === 0 ? COLOR.RED : COLOR.GREEN,
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

    for (let i = 0; i < 20; i++) {
        const num = BOARD_ORDER[i];
        const startDeg = i * SEGMENT_ANGLE - SEGMENT_ANGLE / 2;
        const endDeg = startDeg + SEGMENT_ANGLE;
        const colors = segmentColor(i);

        // Double ring
        segments.push({
            id: `d-${num}`,
            ring: 'D',
            segment: num,
            path: arcPath(cx, cy, RADII.DOUBLE_OUTER, RADII.DOUBLE_INNER, startDeg, endDeg),
            fill: colors.multi,
        });

        // Single outer
        segments.push({
            id: `so-${num}`,
            ring: 'SO',
            segment: num,
            path: arcPath(cx, cy, RADII.SINGLE_OUTER_OUTER, RADII.SINGLE_OUTER_INNER, startDeg, endDeg),
            fill: colors.single,
        });

        // Triple ring
        segments.push({
            id: `t-${num}`,
            ring: 'T',
            segment: num,
            path: arcPath(cx, cy, RADII.TRIPLE_OUTER, RADII.TRIPLE_INNER, startDeg, endDeg),
            fill: colors.multi,
        });

        // Single inner
        segments.push({
            id: `si-${num}`,
            ring: 'SI',
            segment: num,
            path: arcPath(cx, cy, RADII.SINGLE_INNER_OUTER, RADII.SINGLE_INNER_INNER, startDeg, endDeg),
            fill: colors.single,
        });
    }

    // Outer bull (single bull)
    segments.push({
        id: 'sbull',
        ring: 'SBULL',
        segment: 25,
        circle: { cx, cy, r: RADII.BULL_OUTER },
        fill: COLOR.BULL_GREEN,
    });

    // Inner bull (double bull / bullseye)
    segments.push({
        id: 'dbull',
        ring: 'DBULL',
        segment: 50,
        circle: { cx, cy, r: RADII.BULL_INNER },
        fill: COLOR.BULL_RED,
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
