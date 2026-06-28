// Parse Granboard BLE notifications into hit events.
//
// The board sends text over BLE NOTIFY, framed with '@' delimiters.
// Each frame is either:
//   "BTN"        — the physical button on the board was pressed
//   "OUT"        — dart landed outside the scoring area
//   "2.5"        — a segment code (looked up in SEGMENT_MAP)
//   "WRITE OK"   — acknowledgement of a write command (ignored)
//
// Frames may arrive split across multiple BLE packets, and some boards
// send a "GB8;102" prefix before the actual code. We buffer incoming
// data and split on '@' to handle both cases.

import { SEGMENT_MAP, RING } from './protocol.js';

export function createParser() {
  let buffer = '';

  return function parse(dataView) {
    const decoder = new TextDecoder();
    buffer += decoder.decode(dataView);

    const hits = [];

    while (buffer.includes('@')) {
      const idx = buffer.indexOf('@');
      let frame = buffer.slice(0, idx);
      buffer = buffer.slice(idx + 1);

      // Some board firmware versions prefix frames with "GB8;102"
      if (frame.startsWith('GB8;102')) {
        frame = frame.slice(7);
      }

      frame = frame.trim();

      if (frame === 'BTN') {
        hits.push({ type: 'button' });
      } else if (frame === 'OUT') {
        hits.push({ type: 'hit', ring: RING.OUT, segment: 0, points: 0 });
      } else if (SEGMENT_MAP[frame]) {
        const { ring, segment } = SEGMENT_MAP[frame];
        hits.push({ type: 'hit', ring, segment, raw: frame });
      }
      // Ignore 'WRITE OK' and unknown frames
    }

    return hits;
  };
}
