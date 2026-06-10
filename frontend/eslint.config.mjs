import eslint from '@eslint/js';
import tseslint from 'typescript-eslint';
import angular from 'angular-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  { ignores: ['dist', 'node_modules', '.angular'] },
  {
    files: ['**/*.ts'],
    extends: [
      eslint.configs.recommended,
      ...tseslint.configs.recommended,
      ...angular.configs.tsRecommended,
      prettier,
    ],
    processor: angular.processInlineTemplates,
    rules: {
      '@angular-eslint/directive-selector': ['error', { type: 'attribute', prefix: 'app', style: 'camelCase' }],
      // Le design system utilise le préfixe `ui-` (ui-button, ui-input…) en plus de `app-`.
      '@angular-eslint/component-selector': ['error', { type: 'element', prefix: ['app', 'ui'], style: 'kebab-case' }],
      '@typescript-eslint/no-explicit-any': 'off',
      // Le composant `ui-input` ré-expose volontairement des événements de type
      // natif (input/change/blur) en tant que sortie du design system.
      '@angular-eslint/no-output-native': 'off',
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_', caughtErrors: 'none' },
      ],
    },
  },
  {
    files: ['**/*.html'],
    extends: [...angular.configs.templateRecommended],
    rules: {
      // Autorise l'idiome `!= null` / `== null` (filtre null ET undefined).
      '@angular-eslint/template/eqeqeq': ['error', { allowNullOrUndefined: true }],
    },
  },
);
