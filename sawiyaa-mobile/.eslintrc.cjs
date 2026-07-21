module.exports = {
  root: true,
  extends: ['expo', 'plugin:react-hooks/recommended'],
  parser: '@typescript-eslint/parser',
  plugins: ['@typescript-eslint'],
  env: {
    browser: true,
    node: true,
    jest: true,
  },
  ignorePatterns: ['node_modules/', 'dist/', 'build/'],
  rules: {
    // Keep lint useful but non-blocking for existing code style.
    '@typescript-eslint/no-unused-vars': [
      'warn',
      { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
    ],
  },
};

