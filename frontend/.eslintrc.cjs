module.exports = {
  root: true,
  env: { browser: true, es2022: true },
  extends: [
    'eslint:recommended',
    'plugin:react/recommended',
    'plugin:react/jsx-runtime',
    'plugin:react-hooks/recommended',
  ],
  ignorePatterns: ['dist', 'coverage', 'node_modules'],
  parserOptions: { ecmaVersion: 'latest', sourceType: 'module' },
  settings: { react: { version: 'detect' } },
  plugins: ['react-refresh'],
  rules: {
    'react/prop-types': 'off',
    // O'zbekcha matnda apostrof (o', g') juda ko'p — JSX ichida qochirish talab qilinmaydi
    'react/no-unescaped-entities': 'off',
    'no-unused-vars': ['error', { argsIgnorePattern: '^_', varsIgnorePattern: '^_', ignoreRestSiblings: true }],
  },
  overrides: [
    { files: ['*.config.js', '.eslintrc.cjs'], env: { node: true } },
    { files: ['src/**/*.test.{js,jsx}', 'src/test/**'], env: { node: true } },
  ],
};
