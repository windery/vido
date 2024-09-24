import { EditorMode } from './editor';
import { editorStore } from '../store/editor';
import { lastlineStore } from '../store/lastline';
import { taskStore } from '../store/task';

export const initKeyboard = () => {
  // 监听键盘事件
  window.addEventListener('keydown', (event) => {
    const lastline = lastlineStore();
    const editor = editorStore();
    const tasks = taskStore();

    if (needShowKeyboardLog(editor.mode, event.key)) {
      console.info(
        `Current editor mode: ${EditorMode[editor.mode]}, key pressed: ${event.key}`
      );
    }
    if (editor.mode === EditorMode.COMMAND) {
      // command
      if (event.key === 'k') {
        tasks.selectPrevious();
      } else if (event.key === 'j') {
        tasks.selectNext();
      } else if (event.key === 'i') {
        event.preventDefault();
        tasks.startEditing();
        editor.changeMode(EditorMode.EDIT);
      } else if (event.key === '/') {
        lastline.show();
        editor.changeMode(EditorMode.LAST_LINE);
      } else if (event.key === 'Escape') {
        lastline.hide();
      } else if (event.key === ' ') {
        tasks.triggerSelectedCompletion();
      }
    } else if (editor.mode === EditorMode.LAST_LINE) {
      // last line
      if (event.key === 'Escape') {
        editor.changeMode(EditorMode.COMMAND);
        lastline.hide();
      } else if (event.key === 'Enter') {
        lastline.search();
        editor.changeMode(EditorMode.COMMAND);
      }
    } else if (editor.mode === EditorMode.EDIT) {
      // edit
      if (event.key === 'Escape') {
        tasks.stopEditing();
        editor.changeMode(EditorMode.COMMAND);
      }
    }
  });
};
function needShowKeyboardLog(mode: EditorMode, key: string) {
  if (mode === EditorMode.COMMAND) {
    return true;
  }
  if (key === 'Escape') {
    return true;
  }
}
