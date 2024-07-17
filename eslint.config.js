import eslint from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
import eslintConfigPrettier from 'eslint-config-prettier';

export default [
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
  eslint.configs.recommended,
  // ...pluginVue.configs['flat/recommend'],
  ...pluginVue.configs['flat/essential'],
  ...pluginVue.configs['flat/strongly-recommended'],
  eslintConfigPrettier,
];
