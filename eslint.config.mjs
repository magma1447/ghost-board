// Lint config for the headless dirs (test/, bin/, screenshot-engine/). They
// run in Node via the toolbox — not through the app's bundler — so they get
// Node globals; the rules are the app's own (ghost-board/eslint.config.js) so
// the whole repo follows one style. Run:
//   docker compose -f docker/compose.yaml run --rm toolbox npx eslint test bin screenshot-engine
import globals from 'globals';
import appConfig from './ghost-board/eslint.config.js';

export default [
    {
        files: ['test/**/*.mjs', 'bin/**/*.mjs', 'screenshot-engine/**/*.mjs'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.node },
        },
        rules: appConfig[0].rules,
    },
];
