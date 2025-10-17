import js from '@eslint/js';
import globals from 'globals';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import tseslint from 'typescript-eslint';

export default tseslint.config(
  {
    ignores: [
      'dist',
      '../backup_before_restore/**',
      '../ai-service/**',
      '../functions/**',
      '../scripts/**',
      '../run_*.js',
      '../test_*.js',
    ],
  },
  {
    extends: [js.configs.recommended, ...tseslint.configs.recommended],
    files: ['**/*.{ts,tsx}'],
    languageOptions: {
      ecmaVersion: 2020,
      globals: globals.browser,
    },
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      'react-hooks/rules-of-hooks': 'off',
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unused-vars': 'off',
      '@typescript-eslint/no-unused-expressions': 'off',
      '@typescript-eslint/ban-ts-comment': 'off',
      'no-unused-vars': 'off',
      'no-empty-pattern': 'off',
      'no-case-declarations': 'off',
      'no-prototype-builtins': 'off',
      'no-useless-escape': 'off',
      'no-misleading-character-class': 'off',
      'prefer-const': 'off',
    },
  },
  {
    files: [
      'src/App.tsx',
      'src/features/**/*.{ts,tsx}',
      'src/pages/**/*.{ts,tsx}',
      'src/contexts/**/*.{ts,tsx}',
      'src/hooks/**/*.{ts,tsx}',
      'src/services/**/*.{ts,tsx}',
      'src/lib/**/*.{ts,tsx}',
      'src/utils/**/*.{ts,tsx}',
      'src/components/ProtectedRoute.tsx',
      'src/components/ReplitInterface.tsx',
    ],
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'prefer-const': ['error', { destructuring: 'all' }],
    },
  },
);
