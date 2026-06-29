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

function cancelSweep() {
    clearTimeout(sweepTimer);
    sweepTimer = null;
}

// Light a single number (1–20) in the given palette colour, others off.
export function showSegment(segNum, color) {
    cancelSweep();
    const ring = offRing();
    if (segNum >= 1 && segNum <= 20) {
        ring[segNum - 1] = color;
    }
    emitRing(ring);
}

// Light multiple numbers in the given palette colour, others off.
export function showSegments(segNums, color) {
    cancelSweep();
    const ring = offRing();
    for (const n of segNums) {
        if (n >= 1 && n <= 20) {
            ring[n - 1] = color;
        }
    }
    emitRing(ring);
}

export function allOff() {
    cancelSweep();
    emitRing(offRing());
}

export function allOn() {
    cancelSweep();
    emitRing(new Array(20).fill(LED_COLOR.WHITE));
}

export function onHit(ring, segment) {
    cancelSweep();
    emitHit(ring, segment);
}

export function onSwitch() {
    sweep(LED_COLOR.CYAN);
}

// Light each number one at a time in clockwise order (connect / switch anim).
export function sweep(color = LED_COLOR.WHITE) {
    cancelSweep();
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
