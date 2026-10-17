// https://docs.expo.dev/guides/using-eslint/
const { defineConfig } = require('eslint/config');
const expoConfig = require('eslint-config-expo/flat');

module.exports = defineConfig([
  expoConfig,
  {
    ignores: ['dist/*', '.expo/*'],
  },
  {
    files: ['**/*.{ts,tsx}'],
    rules: {
      /**
       * The app's reactivity contract is `useDbQuery(fn)` — each query runs
       * inside a memo keyed on the db revision counter, so every mutation
       * re-runs it. The rule can't see through the SQLite call and flags the
       * pattern, so it stays off here.
       */
      'react-hooks/exhaustive-deps': 'off',

      /**
       * Reanimated's API *is* mutation: shared values are driven by
       * `x.value = withSpring(...)` inside gestures, callbacks and effects.
       * The compiler-powered immutability rule flags every such write and
       * has no Reanimated awareness yet.
       */
      'react-hooks/immutability': 'off',

      /**
       * Needed where effects drive external (animation/gesture) state machines,
       * e.g. Sheet's mount-then-animate-out lifecycle. Tuned by review, not rule.
       */
      'react-hooks/set-state-in-effect': 'warn',

      /**
       * `Date.now()` for an entry timestamp is intentional at mount.
       */
      'react-hooks/purity': 'warn',
    },
  },
]);
