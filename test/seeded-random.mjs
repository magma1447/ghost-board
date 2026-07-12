// Seedable RNG for the test harness. Installing it makes Math.random
// deterministic, so games with random setup (Simon's targets, Cricket's random
// numbers) and the AI scatter replay identically — stable baselines, and any
// failure re-runs the same. Test-only; never imported by the app.

function mulberry32(seed) {
    let a = seed >>> 0;
    return function random() {
        a = (a + 0x6D2B79F5) >>> 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}

export function installSeededRandom(seed) {
    Math.random = mulberry32(seed);
}
