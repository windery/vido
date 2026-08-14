import { createApp } from 'vue';
import App from './App.vue';

import './style.css';

const app = createApp(App);

// 先加载磁盘偏好（主题）再挂载，避免主题闪变
import('./initialize').then(async ({ initialize }) => {
  await initialize();
  app.mount('#app').$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*');

    // 确保在Vue应用完全挂载后再初始化键盘管理器
    setTimeout(() => {
      import('./domain/keyboard/keyboard-manager').then(
        ({ initializeKeyboardManager, getKeyboardManager }) => {
          initializeKeyboardManager();
          // 注入滚动回调，domain 层不再直接访问 window
          getKeyboardManager().setScrollCallback(() => {
            (window as any).scrollToSelectedTask?.();
          });
        }
      );

      // 初始化测试客户端（开发环境）
      import('./utils/test-client').then(({ testClient }) => {
        testClient.init();
      });
    }, 100); // 给一个短暂的延迟确保DOM完全准备好
  });
});
