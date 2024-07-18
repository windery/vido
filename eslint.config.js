import eslint from '@eslint/js';
import pluginVue from 'eslint-plugin-vue';
// import eslintConfigPrettier from "eslint-config-prettier";

export default [
  eslint.configs.recommended,
  // ...pluginVue.configs['flat/recommend'],
  ...pluginVue.configs['flat/essential'],
  ...pluginVue.configs['flat/strongly-recommended'],
  // eslintConfigPrettier
];