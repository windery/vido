import { EditorMode } from './domain/editor';
import { editorStore } from './store/editor';
import { lastlineStore } from './store/lastline';
import { taskStore } from './store/task';

window.addEventListener('keydown', (event) => {
  const lastline = lastlineStore();
  console.log(`Key pressed: ${event.key}`);
  const editor = editorStore();
  const tasks = taskStore();
  if (editor.mode === EditorMode.COMMAND) {
    // command
    if (event.key === 'k') {
      tasks.selectPrevious();
    } else if (event.key === 'j') {
      tasks.selectNext();
    } else if (event.key === 'i') {
      tasks.startEditing();
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
  }
});

// 判断用户系统是否处于深色模式
const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
console.log('isSystemDark', isSystemDark);
if (isSystemDark) {
  document.body.classList.add('dark');
}

// 添加一个监听器，实时监听用户系统主题的变化
window
  .matchMedia('(prefers-color-scheme: dark)')
  .addEventListener('change', (event) => {
    if (event.matches) {
      console.log('system dark mode on');
      document.documentElement.classList.add('dark');
    } else {
      console.log('system dark mode off');
      document.documentElement.classList.remove('dark');
    }
  });
