// Robustness pass: every game × every setting combination × a few AI levels ×
// a couple of seeds. Asserts each game runs to completion with no exception and
// no runaway loop. Run: docker compose -f docker/compose.yaml run --rm toolbox node test/robustness.mjs

import { GAME_LOGIC } from '../ghost-board/src/game-engine/core/games-logic.js';
import { installSeededRandom } from './seeded-random.mjs';
import { runGame, optionCombos } from './harness.mjs';

const LEVELS = [1, 5, 10];
const SEEDS = [1, 2];

let total = 0;
const failures = [];

for (const game of GAME_LOGIC) {
    const combos = optionCombos(game.fields, game.defaults);
    const levels = game.aim ? LEVELS : [10]; // no-AI games run on random darts; level unused
    for (const options of combos) {
        for (const level of levels) {
            for (const seed of SEEDS) {
                installSeededRandom(seed);
                total++;
                const tag = `${game.type} L${level} seed${seed} ${JSON.stringify(options)}`;
                try {
                    const result = runGame(game, options, level);
                    if (result.timedOut) {
                        failures.push(`TIMEOUT  ${tag} (${result.darts} darts)`);
                    } else if (!result.isGameOver) {
                        failures.push(`NO-END   ${tag}`);
                    }
                } catch (e) {
                    failures.push(`CRASH    ${tag} — ${e.message}`);
                }
            }
        }
    }
    console.log(`${game.type.padEnd(18)} ${String(combos.length).padStart(3)} combos × ${levels.length} level(s) × ${SEEDS.length} seeds`);
}

console.log('');
if (failures.length > 0) {
    console.log(`FAILURES (${failures.length} of ${total} runs):`);
    for (const f of failures) {
        console.log('  ' + f);
    }
    process.exit(1);
}
console.log(`ALL PASSED — ${total} game runs, no crashes or loops`);
