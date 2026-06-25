// =============================================================
// Breezy — Configuration ESLint (flat config, ESLint v9)
// Linte les microservices Node.js (ES modules). Le frontend a son
// propre lint (`next lint`) géré dans frontend/.
// =============================================================
import js from '@eslint/js';
import globals from 'globals';

export default [
  {
    ignores: [
      '**/node_modules/**',
      'frontend/**',
      'services/*/uploads/**',
    ],
  },
  js.configs.recommended,
  {
    files: ['services/*/src/**/*.js', 'services/*/test/**/*.js'],
    languageOptions: {
      ecmaVersion: 'latest',
      sourceType: 'module',
      globals: {
        ...globals.node,
      },
    },
    rules: {
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-console': 'off',
      'prefer-const': 'warn',
      eqeqeq: ['warn', 'smart'],
    },
  },
];
