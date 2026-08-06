import js from '@eslint/js';
import globals from 'globals';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';

export default [
  {
    ignores: ['dist/**', 'node_modules/**', 'coverage/**'],
  },
  js.configs.recommended,
  {
    files: ['**/*.{js,jsx}'],
    languageOptions: {
      ecmaVersion: 2022,
      sourceType: 'module',
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
      parserOptions: {
        ecmaFeatures: { jsx: true },
      },
    },
    plugins: {
      react,
      'react-hooks': reactHooks,
    },
    settings: {
      react: { version: 'detect' },
    },
    rules: {
      ...react.configs.recommended.rules,
      ...reactHooks.configs.recommended.rules,

      // The codebase uses the automatic JSX runtime, so neither is required.
      'react/react-in-jsx-scope': 'off',
      'react/jsx-uses-react': 'off',

      // Prop types are not used anywhere in this codebase; enforcing them now
      // would be a large mechanical change unrelated to correctness.
      'react/prop-types': 'off',

      // Rules that indicate a real defect stay at "error" and fail the build:
      // no-undef, react-hooks/rules-of-hooks, eqeqeq, and the js.recommended set.
      eqeqeq: ['error', 'smart'],

      // The rules below are warnings, not because they don't matter, but
      // because this codebase was written before it had a linter. Errors would
      // block every commit on ~130 pre-existing findings. They are surfaced on
      // every run so the backlog stays visible and shrinks incrementally;
      // promote each to "error" once its count reaches zero.
      'no-unused-vars': ['warn', { argsIgnorePattern: '^_', varsIgnorePattern: '^_' }],
      'no-empty': ['warn', { allowEmptyCatch: true }],
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'react/no-unescaped-entities': 'warn',
      // <marquee> is a deliberate part of the retro UI, and React does not
      // know its attributes.
      'react/no-unknown-property': 'warn',
    },
  },
  {
    files: ['**/*.test.{js,jsx}', 'src/test/**/*.{js,jsx}'],
    languageOptions: {
      globals: {
        ...globals.node,
        vi: 'readonly',
        describe: 'readonly',
        it: 'readonly',
        expect: 'readonly',
        beforeEach: 'readonly',
        afterEach: 'readonly',
        beforeAll: 'readonly',
        afterAll: 'readonly',
      },
    },
  },
];
