/**
 * 基础模式处理器接口
 */

import type { Store } from '../state/store';

export interface ModeHandler {
  handleKey(
    event: KeyboardEvent,
    key: string,
    store: Store,
    isInInputField: boolean
  ): boolean;

  dispose(): void;
}
