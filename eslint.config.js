import eslint from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
  eslint.configs.recommended,
  ...pluginVue.configs['flat/base'],
  ...pluginVue.configs['flat/essential'],
  ...pluginVue.configs['flat/recommended'],
  eslintConfigPrettier,
  {
    ignores: [
      'node_modules/**',
      'dist/**',
      'public/**',
      '.vscode',
      'dist-electron',
      'release',
    ],
  },
];
