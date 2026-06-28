// LED effects for Granboard — hit flashes, connect sweep, player switch
//
// Architecture: default handlers that games can override or disable.
//   setHitHandler(fn)    — custom hit LED behavior, or null to disable
//   setSwitchHandler(fn) — custom switch LED behavior, or null to disable
//   resetHandlers()      — restore defaults

import {
  LED_ALL_OFF, LED_COLOR,
  buildRingCommand, buildHitCommand, buildEffectCommand,
} from './protocol.js';

// Standard dartboard clockwise order
const SWEEP_ORDER = [20, 1, 18, 4, 13, 6, 10, 15, 2, 17, 3, 19, 7, 16, 8, 11, 14, 9, 12, 5];

let writeFn = null;
let sweepTimeout = null;

function cancelSweep() {
  clearTimeout(sweepTimeout);
  sweepTimeout = null;
}

function send(data) {
  if (writeFn) {
    writeFn(data);
  }
}

// -- Default hit flash: use built-in board hit animation --
function defaultHitFlash(ring, segment) {
  cancelSweep();

  if (ring === 'SBULL' || ring === 'DBULL') {
    // Bull: flash effect (whole board) in gold
    send(buildEffectCommand(0x17, [0xFF, 0xA0, 0x00], 0x14));
    return;
  }

  // Map ring to hit animation opcode
  let hitType;
  if (ring === 'D') {
    hitType = 0x02;
  } else if (ring === 'T') {
    hitType = 0x03;
  } else {
    hitType = 0x01; // SO, SI
  }

  // Red flash with orange secondary
  send(buildHitCommand(hitType, segment, [0xFF, 0x00, 0x00], [0xFF, 0x95, 0x00], 0x14));
}

// -- Sweep: light each segment sequentially (for connect / switch) --
function runSweep(color, stepMs, onDone) {
  cancelSweep();
  let i = 0;

  function step() {
    if (i >= SWEEP_ORDER.length) {
      send(LED_ALL_OFF);
      if (onDone) {
        onDone();
      }
      return;
    }

    // Build ring with only current segment lit
    const ring = new Array(20).fill(LED_COLOR.OFF);
    // Segment numbers are 1-based, ring array is 0-indexed
    ring[SWEEP_ORDER[i] - 1] = color;
    send(buildRingCommand(ring));

    i++;
    sweepTimeout = setTimeout(step, stepMs);
  }

  step();
}

// -- Default switch animation --
function defaultSwitchAnimation() {
  runSweep(LED_COLOR.CYAN, 40);
}

// -- Configurable handlers (games can override or disable) --
let hitHandler = defaultHitFlash;
let switchHandler = defaultSwitchAnimation;

export function init(write) {
  writeFn = write;
}

export function setHitHandler(fn) {
  hitHandler = fn;
}

export function setSwitchHandler(fn) {
  switchHandler = fn;
}

export function resetHandlers() {
  hitHandler = defaultHitFlash;
  switchHandler = defaultSwitchAnimation;
}

export function onHit(ring, segment) {
  if (hitHandler) {
    hitHandler(ring, segment);
  }
}

export function onSwitch() {
  if (switchHandler) {
    switchHandler();
  }
}

export function sweep() {
  runSweep(LED_COLOR.WHITE, 40);
}

export function allOff() {
  cancelSweep();
  send(LED_ALL_OFF);
}

export function allOn() {
  cancelSweep();
  send(buildRingCommand(new Array(20).fill(LED_COLOR.WHITE)));
}

// Light a single segment (1–20) in the given color, all others off
export function showSegment(segNum, color) {
  cancelSweep();
  const ring = new Array(20).fill(LED_COLOR.OFF);
  if (segNum >= 1 && segNum <= 20) {
    ring[segNum - 1] = color;
  }
  send(buildRingCommand(ring));
}
