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

const OUTPUTS = [];
let sweepTimer = null;
let attractTimer = null;

// Idle "attract mode" spectrum — chased around the ring between flashes.
const ATTRACT_COLORS = [
    LED_COLOR.RED, LED_COLOR.ORANGE, LED_COLOR.YELLOW,
    LED_COLOR.GREEN, LED_COLOR.CYAN, LED_COLOR.PURPLE,
];

export function registerLedOutput(output) {
    OUTPUTS.push(output);
}

function offRing() {
    return new Array(20).fill(LED_COLOR.OFF);
}

function emitRing(colors) {
    for (const output of OUTPUTS) {
        output.ring(colors);
    }
}

function emitHit(ring, segment) {
    for (const output of OUTPUTS) {
        output.hit(ring, segment);
    }
}

// Stop any running animation (sweep or attract) before setting a definite state.
function stopAnimations() {
    clearTimeout(sweepTimer);
    sweepTimer = null;
    clearTimeout(attractTimer);
    attractTimer = null;
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

// Idle "attract mode" — an arcade-style loop shown while no game is running
// (on the board and mirrored on the SVG): a rainbow chase rotating clockwise
// around the ring, punctuated by a bright flash. Any game LED state cancels it.
export function attract() {
    stopAnimations();
    let t = 0;
    function step() {
        // Rainbow gradient rotating one segment per frame — a steady loop, no flash.
        const ring = offRing();
        const len = ATTRACT_COLORS.length;
        for (let i = 0; i < BOARD_ORDER.length; i++) {
            // (i - t) so the gradient rotates clockwise (BOARD_ORDER is clockwise).
            ring[BOARD_ORDER[i] - 1] = ATTRACT_COLORS[((i - t) % len + len) % len];
        }
        emitRing(ring);
        t += 1;
        attractTimer = setTimeout(step, 180);
    }
    step();
}
