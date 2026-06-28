// Granboard BLE protocol — hit parsing, LED commands, and segment mapping.
//
// The Granboard communicates over BLE with three characteristics on one service:
//   NOTIFY — board sends hit events as text frames (e.g. "2.5@" for single-outer 1)
//   WRITE  — app sends LED commands as raw binary (Uint8Array)
//
// Hit frames are "<group>.<bit>@"-delimited strings. The group.bit codes map
// to physical board segments via SEGMENT_MAP (reverse-engineered, not sequential).
//
// Reference: https://github.com/Lennart-Jerome/GranBoard-with-Autodarts

export const SERVICE_UUID = '442f1570-8a00-9a28-cbe1-e1d4212d53eb';
export const NOTIFY_UUID = '442f1571-8a00-9a28-cbe1-e1d4212d53eb';
export const WRITE_UUID = '442f1572-8a00-9a28-cbe1-e1d4212d53eb';
export const DEVICE_NAME = 'GRANBOARD';

// Ring types
export const RING = {
    SINGLE_OUTER: 'SO',
    SINGLE_INNER: 'SI',
    DOUBLE: 'D',
    TRIPLE: 'T',
    SINGLE_BULL: 'SBULL',
    DOUBLE_BULL: 'DBULL',
    OUT: 'OUT',
};

// Raw BLE code -> { ring, segment }
// Keys are "group.bit" strings received from the board's NOTIFY characteristic.
// Each segment has 4 codes (outer single, inner single, double, triple).
// The mapping is not sequential — it reflects the physical sensor wiring.
export const SEGMENT_MAP = {
    // Segment 1
    '2.5': { ring: RING.SINGLE_OUTER, segment: 1 },
    '2.3': { ring: RING.SINGLE_INNER, segment: 1 },
    '2.6': { ring: RING.DOUBLE, segment: 1 },
    '2.4': { ring: RING.TRIPLE, segment: 1 },
    // Segment 2
    '9.2': { ring: RING.SINGLE_OUTER, segment: 2 },
    '9.1': { ring: RING.SINGLE_INNER, segment: 2 },
    '8.2': { ring: RING.DOUBLE, segment: 2 },
    '9.0': { ring: RING.TRIPLE, segment: 2 },
    // Segment 3
    '7.2': { ring: RING.SINGLE_OUTER, segment: 3 },
    '7.1': { ring: RING.SINGLE_INNER, segment: 3 },
    '8.4': { ring: RING.DOUBLE, segment: 3 },
    '7.0': { ring: RING.TRIPLE, segment: 3 },
    // Segment 4
    '0.5': { ring: RING.SINGLE_OUTER, segment: 4 },
    '0.1': { ring: RING.SINGLE_INNER, segment: 4 },
    '0.6': { ring: RING.DOUBLE, segment: 4 },
    '0.3': { ring: RING.TRIPLE, segment: 4 },
    // Segment 5
    '5.4': { ring: RING.SINGLE_OUTER, segment: 5 },
    '5.1': { ring: RING.SINGLE_INNER, segment: 5 },
    '4.6': { ring: RING.DOUBLE, segment: 5 },
    '5.2': { ring: RING.TRIPLE, segment: 5 },
    // Segment 6
    '1.3': { ring: RING.SINGLE_OUTER, segment: 6 },
    '1.0': { ring: RING.SINGLE_INNER, segment: 6 },
    '4.4': { ring: RING.DOUBLE, segment: 6 },
    '1.1': { ring: RING.TRIPLE, segment: 6 },
    // Segment 7
    '11.4': { ring: RING.SINGLE_OUTER, segment: 7 },
    '11.1': { ring: RING.SINGLE_INNER, segment: 7 },
    '8.6': { ring: RING.DOUBLE, segment: 7 },
    '11.2': { ring: RING.TRIPLE, segment: 7 },
    // Segment 8
    '6.5': { ring: RING.SINGLE_OUTER, segment: 8 },
    '6.2': { ring: RING.SINGLE_INNER, segment: 8 },
    '6.6': { ring: RING.DOUBLE, segment: 8 },
    '6.4': { ring: RING.TRIPLE, segment: 8 },
    // Segment 9
    '9.5': { ring: RING.SINGLE_OUTER, segment: 9 },
    '9.3': { ring: RING.SINGLE_INNER, segment: 9 },
    '9.6': { ring: RING.DOUBLE, segment: 9 },
    '9.4': { ring: RING.TRIPLE, segment: 9 },
    // Segment 10
    '2.2': { ring: RING.SINGLE_OUTER, segment: 10 },
    '2.0': { ring: RING.SINGLE_INNER, segment: 10 },
    '4.3': { ring: RING.DOUBLE, segment: 10 },
    '2.1': { ring: RING.TRIPLE, segment: 10 },
    // Segment 11
    '7.5': { ring: RING.SINGLE_OUTER, segment: 11 },
    '7.3': { ring: RING.SINGLE_INNER, segment: 11 },
    '7.6': { ring: RING.DOUBLE, segment: 11 },
    '7.4': { ring: RING.TRIPLE, segment: 11 },
    // Segment 12
    '5.5': { ring: RING.SINGLE_OUTER, segment: 12 },
    '5.0': { ring: RING.SINGLE_INNER, segment: 12 },
    '5.6': { ring: RING.DOUBLE, segment: 12 },
    '5.3': { ring: RING.TRIPLE, segment: 12 },
    // Segment 13
    '0.4': { ring: RING.SINGLE_OUTER, segment: 13 },
    '0.0': { ring: RING.SINGLE_INNER, segment: 13 },
    '4.5': { ring: RING.DOUBLE, segment: 13 },
    '0.2': { ring: RING.TRIPLE, segment: 13 },
    // Segment 14
    '10.5': { ring: RING.SINGLE_OUTER, segment: 14 },
    '10.3': { ring: RING.SINGLE_INNER, segment: 14 },
    '10.6': { ring: RING.DOUBLE, segment: 14 },
    '10.4': { ring: RING.TRIPLE, segment: 14 },
    // Segment 15
    '3.2': { ring: RING.SINGLE_OUTER, segment: 15 },
    '3.0': { ring: RING.SINGLE_INNER, segment: 15 },
    '4.2': { ring: RING.DOUBLE, segment: 15 },
    '3.1': { ring: RING.TRIPLE, segment: 15 },
    // Segment 16
    '11.5': { ring: RING.SINGLE_OUTER, segment: 16 },
    '11.0': { ring: RING.SINGLE_INNER, segment: 16 },
    '11.6': { ring: RING.DOUBLE, segment: 16 },
    '11.3': { ring: RING.TRIPLE, segment: 16 },
    // Segment 17
    '10.2': { ring: RING.SINGLE_OUTER, segment: 17 },
    '10.1': { ring: RING.SINGLE_INNER, segment: 17 },
    '8.3': { ring: RING.DOUBLE, segment: 17 },
    '10.0': { ring: RING.TRIPLE, segment: 17 },
    // Segment 18
    '1.5': { ring: RING.SINGLE_OUTER, segment: 18 },
    '1.2': { ring: RING.SINGLE_INNER, segment: 18 },
    '1.6': { ring: RING.DOUBLE, segment: 18 },
    '1.4': { ring: RING.TRIPLE, segment: 18 },
    // Segment 19
    '6.3': { ring: RING.SINGLE_OUTER, segment: 19 },
    '6.1': { ring: RING.SINGLE_INNER, segment: 19 },
    '8.5': { ring: RING.DOUBLE, segment: 19 },
    '6.0': { ring: RING.TRIPLE, segment: 19 },
    // Segment 20
    '3.5': { ring: RING.SINGLE_OUTER, segment: 20 },
    '3.3': { ring: RING.SINGLE_INNER, segment: 20 },
    '3.6': { ring: RING.DOUBLE, segment: 20 },
    '3.4': { ring: RING.TRIPLE, segment: 20 },
    // Bulls
    '8.0': { ring: RING.SINGLE_BULL, segment: 25 },
    '4.0': { ring: RING.DOUBLE_BULL, segment: 50 },
};

// LED control — all commands are raw binary (Uint8Array)
//
// Static ring command: 20 bytes, one per segment S1–S20
// Each byte is a palette code:
//   0x00=off, 0x01=red, 0x02=orange, 0x03=yellow,
//   0x04=green, 0x05=cyan, 0x06=purple, 0x07=white
//
// Animation command: 16 bytes, opcode-based with RGB colors
//   Byte 0: opcode, Bytes 1-6: color A + B (RGB), Byte 12: speed, Byte 15: 0x01

export const LED_COLOR = {
    OFF: 0x00, RED: 0x01, ORANGE: 0x02, YELLOW: 0x03,
    GREEN: 0x04, CYAN: 0x05, PURPLE: 0x06, WHITE: 0x07,
};

// Segment number → target ID for hit animation commands.
// These IDs are written into bytes 10-11 of the 16-byte hit command
// to tell the board which LED segment to animate. Like the sensor codes,
// these are non-sequential and board-specific.
export const SEG_TARGET_ID = {
    1: 0x001C, 2: 0x0031, 3: 0x0037, 4: 0x0022,
    5: 0x0016, 6: 0x0028, 7: 0x0001, 8: 0x0007,
    9: 0x0010, 10: 0x002B, 11: 0x000A, 12: 0x0013,
    13: 0x0025, 14: 0x000D, 15: 0x002E, 16: 0x0004,
    17: 0x0034, 18: 0x001F, 19: 0x003A, 20: 0x0019,
};

// Build a 20-byte static ring command (one color per segment)
export function buildRingCommand(segments) {
    return new Uint8Array(segments);
}

// Pre-built ring commands
export const LED_ALL_OFF = new Uint8Array(20); // all 0x00
export const LED_ALL_WHITE = new Uint8Array(20).fill(LED_COLOR.WHITE);

// Build a 16-byte hit animation frame.
// hitType: 0x01=single, 0x02=double, 0x03=triple
// Layout: [hitType, R1,G1,B1, R2,G2,B2, _, _, _, tidLo, tidHi, speed, _, _, 0x01]
//   colorA (bytes 1-3): primary flash color (RGB)
//   colorB (bytes 4-6): secondary/fade color (RGB)
//   tid (bytes 10-11):  target segment ID (little-endian)
//   speed (byte 12):    animation speed (higher = faster)
//   byte 15:            must be 0x01 to activate
export function buildHitCommand(hitType, segNum, colorA, colorB, speed) {
    const tid = SEG_TARGET_ID[segNum] ?? 0;
    const u8 = new Uint8Array(16);
    u8[0] = hitType;
    u8[1] = colorA[0]; u8[2] = colorA[1]; u8[3] = colorA[2];
    u8[4] = colorB[0]; u8[5] = colorB[1]; u8[6] = colorB[2];
    u8[10] = tid & 0xFF;
    u8[11] = (tid >> 8) & 0xFF;
    u8[12] = speed;
    u8[15] = 0x01;
    return u8;
}

// Build a 16-byte whole-board animation effect.
// Unlike hit commands (which target one segment), effects animate the entire ring.
// opcode: 0x0F=rainbow rotate, 0x11=chase, 0x14=pulse, 0x17=flash, 0x1D=fade
// Layout: [opcode, R,G,B, _, _, _, _, _, _, _, _, speed, mode, _, 0x01]
export function buildEffectCommand(opcode, colorA, speed, mode) {
    const u8 = new Uint8Array(16);
    u8[0] = opcode;
    if (colorA) {
        u8[1] = colorA[0]; u8[2] = colorA[1]; u8[3] = colorA[2];
    }
    u8[12] = speed ?? 0x0A;
    u8[13] = mode ?? 0x00;
    u8[15] = 0x01;
    return u8;
}

// Points calculation
export function calcPoints(ring, segment) {
    if (ring === RING.DOUBLE_BULL) {
        return 50;
    }
    if (ring === RING.SINGLE_BULL) {
        return 25;
    }
    if (ring === RING.OUT) {
        return 0;
    }
    if (ring === RING.DOUBLE) {
        return segment * 2;
    }
    if (ring === RING.TRIPLE) {
        return segment * 3;
    }
    return segment; // SO and SI
}
