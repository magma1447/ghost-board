// Checkout path solver.
//
// Given a remaining score, how many darts are left in the visit, the finish
// constraint, and the single-bull value (25 standard, or 50 in "50/50" mode),
// returns a finishing combination as label strings (e.g. ['T20','T20','D-Bull'])
// or null if there's no finish in that many darts.
//
// Generic over the finishing ring (single-, double-, triple- and any-out) so
// any game can use it. X01 uses the curated table for standard rules and this
// solver for everything else (any-out, or non-standard bull scoring).

function buildVocab(bullSingle) {
    const triples = [];
    const doubles = [];
    const singles = [];
    for (let n = 20; n >= 1; n--) {
        triples.push({ value: 3 * n, label: `T${n}` });
        doubles.push({ value: 2 * n, label: `D${n}` });
        singles.push({ value: n, label: `${n}` });
    }
    const bull = { value: bullSingle, label: '25' };
    const dbull = { value: 50, label: 'D-Bull' };
    return {
        // Setup (non-final) darts: big scorers first, doubles as a last resort.
        setup: [...triples, dbull, bull, ...singles, ...doubles],
        finishers: {
            double: [...doubles, dbull],
            triple: [...triples],
            single: [...singles, bull],
            any: [...singles, bull, ...doubles, dbull, ...triples],
        },
    };
}

// Pre-built for the two possible single-bull values.
const VOCAB = { 25: buildVocab(25), 50: buildVocab(50) };

// `n` setup darts (any darts) summing to exactly `rem`, in preference order.
function findSetup(setup, rem, n) {
    if (rem <= 0) {
        return null;
    }
    if (n === 1) {
        const d = setup.find((x) => x.value === rem);
        return d ? [d] : null;
    }
    for (const d of setup) {
        if (d.value < rem) {
            const rest = findSetup(setup, rem - d.value, n - 1);
            if (rest) {
                return [d, ...rest];
            }
        }
    }
    return null;
}

export function suggestCheckout(score, dartsLeft, finish = 'double', bullSingle = 25) {
    if (score <= 1 || dartsLeft <= 0) {
        return null;
    }
    const vocab = VOCAB[bullSingle] || VOCAB[25];
    const finishers = vocab.finishers[finish] || vocab.finishers.any;
    // Fewest darts first (finisher-first), so the result is the shortest finish.
    for (let darts = 1; darts <= dartsLeft; darts++) {
        for (const f of finishers) {
            if (darts === 1) {
                if (f.value === score) {
                    return [f.label];
                }
            } else if (f.value < score) {
                const setup = findSetup(vocab.setup, score - f.value, darts - 1);
                if (setup) {
                    const byValueDesc = (a, b) => b.value - a.value;
                    // Read high→low. For a constrained finish the last dart must
                    // stay last (you have to finish on it); for 'any' it doesn't.
                    const path = finish === 'any'
                        ? [...setup, f].sort(byValueDesc)
                        : [...[...setup].sort(byValueDesc), f];
                    return path.map((d) => d.label);
                }
            }
        }
    }
    return null;
}
