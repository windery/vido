import { EditorMode } from './domain/editor';
import { editorStore } from './store/editor';
import { taskStore } from './store/task';

window.addEventListener('keydown', (event) => {
  console.log(`Key pressed: ${event.key}`);
  const mode = editorStore().mode;
  if (mode === EditorMode.COMMAND) {
    if (event.key === 'k') {
      taskStore().selectPrevious();
    } else if (event.key === 'j') {
      taskStore().selectNext();
    }
  }
});
