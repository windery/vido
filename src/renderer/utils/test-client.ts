/**
 * 测试客户端 - 通过Electron IPC接收键盘指令
 */

import { logger } from './logger';

declare global {
  interface Window {
    testAPI: {
      onKeyboardEvent: (callback: (data: { key: string }) => void) => void;
      onKeyboardSequence: (
        callback: (data: { keys: string[] }) => void
      ) => void;
      simulateKey: (key: string) => void;
    };
  }
}

/**
 * 解析模拟按键字符串："Ctrl+v" / "ctrl+V" → { key: 'v', ctrlKey: true }。
 * 修饰键前缀大小写不敏感，其余原样作为 event.key。
 */
export function parseSimulatedKey(rawKey: string): { key: string; ctrlKey: boolean } {
  const m = /^(ctrl|control)\+/i.exec(rawKey);
  if (m) {
    return { key: rawKey.slice(m[0].length), ctrlKey: true };
  }
  return { key: rawKey, ctrlKey: false };
}

class TestClient {
  private isEnabled: boolean = false;

  init(): void {
    logger.info('TestClient', 'TestClient init called');

    if (!import.meta.env.DEV) {
      logger.warn(
        'TestClient',
        'Not in development mode, skipping initialization'
      );
      return; // 只在开发环境启用
    }

    // 检查testAPI是否可用
    logger.info('TestClient', `window.testAPI exists: ${!!window.testAPI}`);
    if (window.testAPI) {
      logger.info(
        'TestClient',
        `testAPI methods: ${Object.keys(window.testAPI).join(', ')}`
      );
    }

    if (!window.testAPI) {
      logger.warn(
        'TestClient',
        'testAPI not available, running in browser mode'
      );
      return;
    }

    this.isEnabled = true;

    // 监听来自主进程的键盘事件
    window.testAPI.onKeyboardEvent((data) => {
      logger.info('TestClient', `Received keyboard event via IPC: ${data.key}`);
      this.simulateKeyboardEvent(data.key);
    });

    window.testAPI.onKeyboardSequence((data) => {
      logger.info(
        'TestClient',
        `Received keyboard sequence via IPC: ${data.keys.join(', ')}`
      );
      this.simulateKeyboardSequence(data.keys);
    });

    // 验证testAPI方法的可用性
    const testAPI = window.testAPI as any;
    const expectedMethods = ['simulateKey', 'simulateSequence', 'isEnabled'];
    const availableMethods = Object.keys(testAPI);

    logger.info(
      'TestClient',
      `Available testAPI methods: ${availableMethods.join(', ')}`
    );

    const missingMethods = expectedMethods.filter((method) => !testAPI[method]);
    if (missingMethods.length > 0) {
      logger.warn(
        'TestClient',
        `Missing testAPI methods: ${missingMethods.join(', ')}`
      );
    } else {
      logger.info('TestClient', 'All required testAPI methods are available');
    }

    logger.info('TestClient', 'Test client initialized with Electron IPC');
  }

  private simulateKeyboardEvent(rawKey: string): void {
    const { key, ctrlKey } = parseSimulatedKey(rawKey);

    // 创建并分发键盘事件
    const event = new KeyboardEvent('keydown', {
      key: key,
      bubbles: true,
      cancelable: true,
      ctrlKey,
    });

    // 首先在document上触发（用于全局键盘管理器）
    document.dispatchEvent(event);

    // 如果当前有活动的input元素，也在该元素上触发事件（不冒泡）：
    // 输入框自身的监听器（@keydown 等）收到直发事件，而键盘管理器只经
    // document 投递一次——冒泡会导致同一按键被全局管理器处理两次
    // （p 粘贴两次、dd 删两个任务、标题字符翻倍）。
    const activeElement = document.activeElement;
    if (
      activeElement &&
      (activeElement instanceof HTMLInputElement ||
        activeElement instanceof HTMLTextAreaElement)
    ) {
      const targetEvent = new KeyboardEvent('keydown', {
        key: key,
        bubbles: false,
        cancelable: true,
        ctrlKey,
      });
      activeElement.dispatchEvent(targetEvent);

      // 对于可输入字符，还需要模拟input事件来更新v-model
      if (this.isInputCharacter(key) && !ctrlKey) {
        // 更新input的value
        const currentValue = activeElement.value;
        const newValue = currentValue + key;
        activeElement.value = newValue;

        // 触发input事件
        const inputEvent = new Event('input', {
          bubbles: true,
          cancelable: true,
        });
        activeElement.dispatchEvent(inputEvent);

        logger.info(
          'TestClient',
          `Updated input value: "${currentValue}" -> "${newValue}"`
        );
      }

      logger.info(
        'TestClient',
        `Also dispatched on active input element: ${activeElement.className}`
      );
    }

    logger.info('TestClient', `Simulated keyboard event: ${key}`);
  }

  /**
   * 判断是否为可输入字符
   */
  private isInputCharacter(key: string): boolean {
    // 只处理单个字符的输入
    return (
      key.length === 1 &&
      /^[a-zA-Z0-9\u4e00-\u9fa5\s\-_.,;:!@#$%^&*()+={}[\]|\\<>?/~`]$/.test(key)
    );
  }

  private simulateKeyboardSequence(keys: string[]): void {
    keys.forEach((key, index) => {
      setTimeout(() => {
        this.simulateKeyboardEvent(key);
      }, index * 150); // 150ms间隔确保事件正确处理
    });
  }

  disconnect(): void {
    this.isEnabled = false;
    logger.info('TestClient', 'Test client disconnected');
  }

  isConnected(): boolean {
    return this.isEnabled;
  }
}

export const testClient = new TestClient();
