// Physical LED output — encodes LED state into Granboard BLE commands and writes
// them. One of the outputs the LED controller fans out to (see led-controller.js);
// it knows nothing about the SVG board.

import { buildRingCommand, buildHitCommand, buildEffectCommand } from './protocol.js';

export function createPhysicalLeds(write) {
    return {
        // Static ring: one palette colour per number (1–20).
        ring(colors) {
            if (write) {
                write(buildRingCommand(colors));
            }
        },

        // Hit flash: the board's built-in hit animation for the segment.
        hit(ring, segment) {
            if (!write) {
                return;
            }
            if (ring === 'SBULL' || ring === 'DBULL') {
                // Bull: whole-board flash in gold
                write(buildEffectCommand(0x17, [0xFF, 0xA0, 0x00], 0x14));
                return;
            }
            let hitType = 0x01; // SO, SI
            if (ring === 'D') {
                hitType = 0x02;
            } else if (ring === 'T') {
                hitType = 0x03;
            }
            // Red flash with orange secondary
            write(buildHitCommand(hitType, segment, [0xFF, 0x00, 0x00], [0xFF, 0x95, 0x00], 0x14));
        },
    };
}
