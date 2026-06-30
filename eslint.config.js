import globals from 'globals';

export default [
    {
        files: ['src/**/*.js'],
        languageOptions: {
            ecmaVersion: 'latest',
            sourceType: 'module',
            globals: { ...globals.browser, __APP_VERSION__: 'readonly' },
        },
        rules: {
            // Braces & blocks
            'curly': ['error', 'all'],
            'brace-style': ['error', '1tbs', { allowSingleLine: false }],

            // Spacing
            'indent': ['error', 4],
            'semi': ['error', 'always'],
            'comma-dangle': ['error', 'always-multiline'],
            'comma-spacing': ['error', { before: false, after: true }],
            'key-spacing': ['error', { beforeColon: false, afterColon: true }],
            'keyword-spacing': ['error', { before: true, after: true }],
            'space-before-blocks': ['error', 'always'],
            'space-before-function-paren': ['error', { anonymous: 'always', named: 'never', asyncArrow: 'always' }],
            'space-infix-ops': 'error',
            'space-in-parens': ['error', 'never'],
            'arrow-spacing': ['error', { before: true, after: true }],
            'object-curly-spacing': ['error', 'always'],
            'array-bracket-spacing': ['error', 'never'],

            // Equality
            'eqeqeq': ['error', 'always'],

            // Variables
            'no-var': 'error',
            'prefer-const': ['error', { destructuring: 'all' }],
            'no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],

            // Best practices
            'no-multi-spaces': 'error',
            'no-multiple-empty-lines': ['error', { max: 1 }],
            'no-trailing-spaces': 'error',
            'eol-last': ['error', 'always'],
            'quotes': ['error', 'single', { avoidEscape: true }],
        },
    },
];
