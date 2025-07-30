import { createApp } from 'vue';
import { createPinia } from 'pinia';
import App from './App.vue';
import ElementPlus from 'element-plus';
import 'element-plus/dist/index.css';
import 'element-plus/theme-chalk/dark/css-vars.css'; // 引入暗色主题的样式变量

import './style.css';

const pinia = createPinia();

const app = createApp(App);
app.use(ElementPlus);
app.use(pinia);

// 在Pinia设置完成后再初始化
import('./initialize').then(() => {
  app.mount('#app').$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*');

    // 确保在Vue应用完全挂载后再初始化键盘管理器
    setTimeout(() => {
      import('./domain/keyboard/keyboard-manager').then(
        ({ initializeKeyboardManager }) => {
          initializeKeyboardManager();
        }
      );

      // 初始化测试客户端（开发环境）
      import('./utils/test-client').then(({ testClient }) => {
        testClient.init();
      });
    }, 100); // 给一个短暂的延迟确保DOM完全准备好
  });
});
