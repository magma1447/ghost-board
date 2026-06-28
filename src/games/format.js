// Shared formatting helpers for game panels and setup screens

export function formatDart(dart) {
  if (dart.ring === 'OUT') {
    return 'Miss';
  }
  if (dart.ring === 'DBULL') {
    return 'BULL';
  }
  if (dart.ring === 'SBULL') {
    return 'Bull';
  }
  const prefix = { D: 'D', T: 'T', SO: 'S', SI: 'S' }[dart.ring];
  return `${prefix}${dart.segment}`;
}

export function formatBool(value) {
  return value ? 'on' : 'off';
}

export function formatRounds(value) {
  return value === 0 ? 'no limit' : String(value);
}
