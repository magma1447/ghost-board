// Shared Cricket number/mark primitives, used by Cricket and Scram.
//
// A "mark" is a hit toward closing a number: single = 1, double = 2, treble = 3;
// outer bull = 1, inner bull = 2. A number is closed at 3 marks. numberValue()
// gives the points a number is worth (bull = 25).

export const STANDARD_NUMBERS = [20, 19, 18, 17, 16, 15];

// `count` unique random segments (1–20), high → low, for Random Cricket.
export function randomNumbers(count) {
    const pool = [];
    for (let i = 1; i <= 20; i++) {
        pool.push(i);
    }
    const picked = [];
    for (let k = 0; k < count; k++) {
        picked.push(pool.splice(Math.floor(Math.random() * pool.length), 1)[0]);
    }
    return picked.sort((a, b) => b - a);
}

// The seven target numbers: 15–20 + bull, fixed 14–20 (no bull), six random +
// bull, or seven random.
export function buildNumbers(mode) {
    if (mode === 'fixed14') {
        return [20, 19, 18, 17, 16, 15, 14];
    }
    if (mode === 'randomBull') {
        return [...randomNumbers(6), 'bull'];
    }
    if (mode === 'randomNoBull') {
        return randomNumbers(7);
    }
    return [...STANDARD_NUMBERS, 'bull'];
}

// Which target number a dart hit and how many marks, or null if off-target.
export function dartMarks(ring, segment, numbers) {
    if (ring === 'SBULL') {
        return { number: 'bull', marks: 1 };
    }
    if (ring === 'DBULL') {
        return { number: 'bull', marks: 2 };
    }
    if ((ring === 'SO' || ring === 'SI' || ring === 'D' || ring === 'T') && numbers.includes(segment)) {
        return { number: segment, marks: ring === 'T' ? 3 : ring === 'D' ? 2 : 1 };
    }
    return null;
}

export function numberValue(number) {
    return number === 'bull' ? 25 : number;
}

// The scoreboard glyph for a mark count: / (1), ✕ (2), ○ (closed).
export function markGlyph(marks) {
    return marks >= 3 ? '○' : marks === 2 ? '✕' : marks === 1 ? '/' : '';
}
