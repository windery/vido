/**
 * 帮助模式处理器
 */

import { Store } from '../state/store';

export class HelpModeHandler {
  private keySequence: string = '';

  handleKey(event: KeyboardEvent, taskDataManager: Store): boolean {
    event.preventDefault();

    // 处理多键序列
    this.keySequence += event.key;

    // 检查gg序列
    if (this.keySequence === 'gg') {
      this.keySequence = '';
      this.scrollHelpPanelToTop();
      return true;
    }

    // 单键处理
    switch (event.key) {
      case 'j':
        this.keySequence = '';
        this.scrollHelpPanel('down');
        return true;
      case 'k':
        this.keySequence = '';
        this.scrollHelpPanel('up');
        return true;
      case 'G':
        this.keySequence = '';
        this.scrollHelpPanelToBottom();
        return true;
      case 'g':
        // 等待第二个g键
        return true;
      case '?':
      case 'Escape':
        this.keySequence = '';
        taskDataManager.toggleHelp();
        return true;
      default:
        // 其他键重置序列
        this.keySequence = '';
        return true;
    }

    // 如果序列长度超过2，重置
    if (this.keySequence.length > 2) {
      this.keySequence = '';
    }

    return true;
  }

  private scrollHelpPanel(direction: 'up' | 'down'): void {
    const helpContent = document.querySelector('.help-content');
    if (helpContent) {
      const scrollAmount = direction === 'down' ? 50 : -50;
      helpContent.scrollTop += scrollAmount;
    }
  }

  private scrollHelpPanelToBottom(): void {
    const helpContent = document.querySelector('.help-content');
    if (helpContent) {
      helpContent.scrollTop = helpContent.scrollHeight;
    }
  }

  private scrollHelpPanelToTop(): void {
    const helpContent = document.querySelector('.help-content');
    if (helpContent) {
      helpContent.scrollTop = 0;
    }
  }
}
