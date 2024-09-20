import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css'; // 引入暗色主题的样式变量

import './style.css';

import './demos/ipc';
import './initialize';
import piniaLogger from './store/piniaLogger';
// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'

const pinia = createPinia();
pinia.use(piniaLogger);

createApp(App)
  .use(ElementPlus)
  .use(pinia)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*');
  });
