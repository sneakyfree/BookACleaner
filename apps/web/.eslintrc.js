// Self-contained ESLint config for apps/web (root: true stops ESLint from
// walking up to the repo-root .eslintrc.js). The root config declares the
// @typescript-eslint plugin, which only resolves from a root `npm install`;
// CI (and most local workflows) only install apps/web deps, so `next lint`
// failed with "Cannot find module '@typescript-eslint/eslint-plugin'".
// Everything referenced here resolves from apps/web/node_modules.
module.exports = {
  root: true,
  extends: ['next/core-web-vitals', 'prettier'],
  ignorePatterns: ['node_modules/', '.next/', 'coverage/'],
  overrides: [
    {
      files: ['**/*.ts', '**/*.tsx'],
      parser: '@typescript-eslint/parser',
      extends: ['plugin:@typescript-eslint/recommended'],
      plugins: ['@typescript-eslint'],
      rules: {
        // Mirrors the repo-root config's TypeScript rule set.
        'react/react-in-jsx-scope': 'off',
        'react/prop-types': 'off',
        '@typescript-eslint/no-unused-vars': ['warn', { argsIgnorePattern: '^_' }],
        '@typescript-eslint/no-explicit-any': 'warn',
        '@typescript-eslint/explicit-function-return-type': 'off',
        '@typescript-eslint/explicit-module-boundary-types': 'off',
        'react/no-unescaped-entities': 'off',
      },
    },
  ],
}
