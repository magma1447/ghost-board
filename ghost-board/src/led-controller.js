// LED controller — the single place that turns game intent into LED state and
// fans it out to every registered output. LED state ORIGINATES here and flows
// OUT to the outputs (the physical board over BLE, and the SVG board); BLE is
// never in the SVG's update path.
//
// Outputs are dumb renderers implementing { ring(colors), hit(ring, segment) }.
// `colors` is a 20-entry array of palette indices (LED_COLOR), one per number
// (1–20). This layer owns the colour-array building and animation timing.

import { LED_COLOR } from './ble/protocol.js';
import { BOARD_ORDER } from './board/segments.js';
import { settings } from './state/settings.js';

// Each output is { output, physical } — `physical` marks the real board (over
// BLE) so idle attract mode can target it separately from the SVG mirror.
const OUTPUTS = [];
let sweepTimer = null;
let attractTimer = null;
// Are we in idle attract mode (vs a game / off)? Tracked separately from
// attractTimer because 'none' mode is idle but runs no timer.
let idle = false;

// Idle "attract mode" spectrum — a rainbow chased around the ring.
const ATTRACT_COLORS = [
    LED_COLOR.RED, LED_COLOR.ORANGE, LED_COLOR.YELLOW,
    LED_COLOR.GREEN, LED_COLOR.CYAN, LED_COLOR.PURPLE,
];

export function registerLedOutput(output, { physical = false } = {}) {
    OUTPUTS.push({ output, physical });
}

function offRing() {
    return new Array(20).fill(LED_COLOR.OFF);
}

// target: 'all' (default), 'physical' (real board only), or 'svg' (mirror only).
function emitRing(colors, target = 'all') {
    for (const o of OUTPUTS) {
        if (target === 'physical' && !o.physical) {
            continue;
        }
        if (target === 'svg' && o.physical) {
            continue;
        }
        o.output.ring(colors);
    }
}

function emitHit(ring, segment) {
    for (const o of OUTPUTS) {
        o.output.hit(ring, segment);
    }
}

// Stop any running animation (sweep or attract) before setting a definite state.
function stopAnimations() {
    clearTimeout(sweepTimer);
    sweepTimer = null;
    clearTimeout(attractTimer);
    attractTimer = null;
    idle = false;
}

// Light a single number (1–20) in the given palette colour, others off.
export function showSegment(segNum, color) {
    stopAnimations();
    const ring = offRing();
    if (segNum >= 1 && segNum <= 20) {
        ring[segNum - 1] = color;
    }
    emitRing(ring);
}

// Light multiple numbers in the given palette colour, others off.
export function showSegments(segNums, color) {
    stopAnimations();
    const ring = offRing();
    for (const n of segNums) {
        if (n >= 1 && n <= 20) {
            ring[n - 1] = color;
        }
    }
    emitRing(ring);
}

// Light several colour groups in one ring (others off) — e.g. green targets
// plus a red warning segment. groups: [{ segments: number[], color }].
export function showSegmentColors(groups) {
    stopAnimations();
    const ring = offRing();
    for (const group of groups) {
        for (const n of group.segments) {
            if (n >= 1 && n <= 20) {
                ring[n - 1] = group.color;
            }
        }
    }
    emitRing(ring);
}

export function allOff() {
    stopAnimations();
    emitRing(offRing());
}

export function onHit(ring, segment) {
    stopAnimations();
    emitHit(ring, segment);
}

export function onSwitch() {
    sweep(LED_COLOR.CYAN);
}

// Light each number one at a time in clockwise order (connect / switch anim).
export function sweep(color = LED_COLOR.WHITE) {
    stopAnimations();
    let i = 0;
    function step() {
        if (i >= BOARD_ORDER.length) {
            emitRing(offRing());
            return;
        }
        const ring = offRing();
        ring[BOARD_ORDER[i] - 1] = color;
        emitRing(ring);
        i += 1;
        sweepTimer = setTimeout(step, 40);
    }
    step();
}

// Idle "attract mode" — a slow clockwise rainbow rotating around the ring while
// no game is running. The "Idle LED animation" setting picks where it shows:
// 'both' (board + SVG), 'board' (real board only, SVG dark), or 'none' (dark).
// Any real game LED state cancels it.
export function attract() {
    stopAnimations();
    idle = true;
    const mode = settings().display.idleLeds;
    if (mode === 'none') {
        emitRing(offRing());
        return;
    }
    if (mode === 'board') {
        emitRing(offRing(), 'svg'); // keep the SVG mirror dark
    }
    const target = mode === 'board' ? 'physical' : 'all';
    let t = 0;
    function step() {
        const ring = offRing();
        const len = ATTRACT_COLORS.length;
        for (let i = 0; i < BOARD_ORDER.length; i++) {
            // (i - t) so the gradient rotates clockwise (BOARD_ORDER is clockwise).
            ring[BOARD_ORDER[i] - 1] = ATTRACT_COLORS[((i - t) % len + len) % len];
        }
        emitRing(ring, target);
        t += 1;
        attractTimer = setTimeout(step, 180);
    }
    step();
}

// Re-run the attract with the current setting, but only while it's already
// active (idle) — so changing the setting mid-game doesn't stomp game LEDs.
export function refreshAttractIfActive() {
    if (idle) {
        attract();
    }
}
