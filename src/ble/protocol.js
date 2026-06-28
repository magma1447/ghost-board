// Granboard BLE protocol constants
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
// Segment numbers are the actual dartboard numbers (1-20, 25, 50)
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
