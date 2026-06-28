// Parse Granboard BLE notifications into hit events

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

      // Strip GB8 prefix if present
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
