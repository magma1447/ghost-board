#!/usr/bin/env node
// Headless 501 benchmark for the AI levels (#75).
//
// Plays many solo, standard 501 legs (double-out, 25/50 bull) with each AI level
// and reports the metrics the sport actually quotes:
//   - 3-dart average — POOLED: (total points / total darts) x 3 across all legs,
//     with a busted / non-checkout visit counted as a full 3 darts (only the
//     winning visit can be fewer). This is how a match/tournament average is
//     computed. See https://en.wikipedia.org/wiki/Three-dart_average
//   - average rounds (3-dart visits) to finish a leg
//   - average OUTs per leg (darts that miss the board entirely)
//   - bust rate (busts per leg)
//
// Pure Node — imports only the game + AI logic, no Vite / browser. Legs are
// independent, so the work is split into chunks and run across a worker_threads
// pool (stdlib, no deps); this scales over both legs and levels, so even a
// single-level run is fully parallel. Run via the toolbox container (has Node):
//   docker compose -f docker/compose.yaml run --rm toolbox \
//       node bin/x01-benchmark.mjs [--legs 10000] [--levels 1-3,5,8-10] [--threads N]

import { isMainThread, Worker, parentPort } from 'node:worker_threads';
import os from 'node:os';
import { createX01 } from '../app/src/games/x01/game.js';
import { x01Aim } from '../app/src/games/x01/ai.js';
import { AI_PROFILES, applyScatter } from '../app/src/ai/scatter.js';

// Standard competition 501.
const OPTIONS = { numPlayers: 1, startingScore: 501, doubleOut: true, doubleIn: false, bullMode: '25/50' };
const MAX_DARTS = 500; // guard a stuck leg (double-out marooned on 1); real legs finish far sooner

// One solo leg. Returns { won, scoringDarts, rounds, outs, busts }. scoringDarts
// counts every non-winning visit as 3 darts and the winning visit as its actual
// darts — the standard way of counting for the average.
function playLeg(level) {
    const profile = AI_PROFILES[level];
    const game = createX01({ ...OPTIONS });
    const dartsPerTurn = game.getState().dartsPerTurn;
    let scoringDarts = 0;
    let physicalDarts = 0;
    let rounds = 0;
    let outs = 0;
    let busts = 0;

    for (;;) {
        const state = game.getState();
        if (state.isGameOver) {
            return { won: true, scoringDarts, rounds, outs, busts };
        }
        // Turn over (all darts thrown, or a bust locked it) → a completed
        // non-winning visit counts as three darts; hand on.
        if (state.turn.locked || state.turn.darts.length >= dartsPerTurn) {
            rounds += 1;
            scoringDarts += dartsPerTurn;
            game.nextPlayer();
            continue;
        }
        const hit = applyScatter(x01Aim(state), profile);
        if (hit.ring === 'OUT') {
            outs += 1;
        }
        const result = game.onDart(hit.ring, hit.segment);
        physicalDarts += 1;
        if (result.event === 'bust') {
            busts += 1;
        }
        if (result.event === 'win') {
            rounds += 1;
            scoringDarts += game.getState().turn.darts.length; // winning visit: actual darts
            return { won: true, scoringDarts, rounds, outs, busts };
        }
        if (physicalDarts >= MAX_DARTS) {
            return { won: false, scoringDarts, rounds, outs, busts };
        }
    }
}

// Run `legs` legs of one level; return summed stats (add across chunks).
function runChunk(level, legs) {
    const acc = { points: 0, darts: 0, rounds: 0, outs: 0, busts: 0, won: 0, stuck: 0 };
    for (let i = 0; i < legs; i++) {
        const r = playLeg(level);
        if (!r.won) {
            acc.stuck += 1; // unfinished (hit the dart cap) — excluded from the averages
            continue;
        }
        acc.won += 1;
        acc.points += OPTIONS.startingScore;
        acc.darts += r.scoringDarts;
        acc.rounds += r.rounds;
        acc.outs += r.outs;
        acc.busts += r.busts;
    }
    return acc;
}

function accumulate(target, partial) {
    for (const key of Object.keys(target)) {
        target[key] += partial[key];
    }
}

// ---- worker mode: process chunk tasks sent by the main thread ----
function runWorker() {
    parentPort.on('message', (task) => {
        parentPort.postMessage({ level: task.level, acc: runChunk(task.level, task.legs) });
    });
}

// ---- main mode ----
function argValue(name, fallback) {
    const i = process.argv.indexOf(name);
    return i >= 0 && i + 1 < process.argv.length ? process.argv[i + 1] : fallback;
}

// Parse "1-3,5,8-10" into a sorted list, intersected with the levels that exist.
function parseLevels(spec, valid) {
    const set = new Set();
    for (const part of spec.split(',')) {
        const m = part.trim().match(/^(\d+)(?:-(\d+))?$/);
        if (!m) {
            continue;
        }
        const lo = Number(m[1]);
        const hi = m[2] ? Number(m[2]) : lo;
        for (let n = Math.min(lo, hi); n <= Math.max(lo, hi); n++) {
            set.add(n);
        }
    }
    return valid.filter((n) => set.has(n));
}

function pad(value, width) {
    const s = String(value);
    return s.length >= width ? s : ' '.repeat(width - s.length) + s;
}

// Run all chunk tasks across a pool of `threads` workers.
function runPool(tasks, threads, onResult) {
    return new Promise((resolve, reject) => {
        let next = 0;
        let received = 0;
        const workers = [];
        const feed = (worker) => {
            if (next < tasks.length) {
                worker.postMessage(tasks[next++]);
            } else {
                worker.terminate();
            }
        };
        for (let i = 0; i < Math.min(threads, tasks.length); i++) {
            const worker = new Worker(new URL(import.meta.url));
            worker.on('message', (result) => {
                onResult(result);
                received += 1;
                if (received === tasks.length) {
                    workers.forEach((w) => w.terminate());
                    resolve();
                } else {
                    feed(worker);
                }
            });
            worker.on('error', reject);
            workers.push(worker);
            feed(worker); // initial task
        }
    });
}

async function main() {
    const legs = Math.max(1, parseInt(argValue('--legs', '10000'), 10) || 10000);
    const allLevels = Object.keys(AI_PROFILES).map(Number).sort((a, b) => a - b);
    const levelsSpec = argValue('--levels', null);
    const levels = levelsSpec ? parseLevels(levelsSpec, allLevels) : allLevels;
    const cores = os.availableParallelism ? os.availableParallelism() : os.cpus().length;
    const threads = Math.max(1, parseInt(argValue('--threads', String(cores)), 10) || 1);

    // Split each level's legs into ~4x threads chunks for balanced load.
    const chunk = Math.max(1, Math.ceil(legs / (threads * 4)));
    const tasks = [];
    for (const level of levels) {
        for (let rem = legs; rem > 0; rem -= chunk) {
            tasks.push({ level, legs: Math.min(chunk, rem) });
        }
    }

    const agg = {};
    for (const level of levels) {
        agg[level] = { points: 0, darts: 0, rounds: 0, outs: 0, busts: 0, won: 0, stuck: 0 };
    }

    console.log(`X01 AI benchmark — solo 501, double-out, 25/50 bull · ${legs} legs/level · ${threads} thread${threads === 1 ? '' : 's'}`);
    console.log('3-dart average = pooled (total points / total darts) x 3; a non-checkout visit counts as 3 darts.\n');
    console.log(`${pad('Lvl', 3)} | ${pad('3-dart avg', 11)} | ${pad('rounds/leg', 10)} | ${pad('outs/leg', 8)} | ${pad('busts/leg', 9)} | ${pad('stuck', 5)}`);
    console.log('-'.repeat(64));

    const started = Date.now();
    if (threads === 1) {
        for (const t of tasks) {
            accumulate(agg[t.level], runChunk(t.level, t.legs));
        }
    } else {
        await runPool(tasks, threads, (result) => accumulate(agg[result.level], result.acc));
    }
    const elapsed = ((Date.now() - started) / 1000).toFixed(1);

    for (const level of levels) {
        const a = agg[level];
        if (a.won === 0) {
            console.log(`${pad(level, 3)} | ${pad('—', 11)} | ${pad('—', 10)} | ${pad('—', 8)} | ${pad('—', 9)} | ${pad(a.stuck, 5)}`);
            continue;
        }
        const avg = (a.points / a.darts) * 3;
        console.log(`${pad(level, 3)} | ${pad(avg.toFixed(2), 11)} | ${pad((a.rounds / a.won).toFixed(1), 10)} | ${pad((a.outs / a.won).toFixed(1), 8)} | ${pad((a.busts / a.won).toFixed(2), 9)} | ${pad(a.stuck, 5)}`);
    }
    console.log(`\nDone in ${elapsed}s — ${legs * levels.length} legs total (${levels.length} level${levels.length === 1 ? '' : 's'} × ${legs}). "stuck" = legs that hit the ${MAX_DARTS}-dart cap (excluded from the averages).`);
}

if (isMainThread) {
    main();
} else {
    runWorker();
}
