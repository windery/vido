import { Task } from '../task';
import { TaskList } from '../entities/task-list';
import { saveJsonFile, loadJsonFile } from '../../utils/file-operations-ipc';
import { migrateSchedule } from '../../utils/schedule-helper';
import { setMaxId } from './task-crud';
import { logger } from '../../utils/logger';

export async function saveTasks(list: TaskList, maxId: number): Promise<void> {
  const data = {
    tasks: list.items.map((t) => ({
      id: t.id, title: t.title, content: t.content,
      completed: t.completed, flagged: t.flagged, priority: t.priority, tags: t.tags,
      schedule: t.schedule, updatedAt: t.updatedAt, indent: t.indent,
    })),
    maxId,
    version: '1.0.0',
    lastModified: new Date().toISOString(),
  };
  await saveJsonFile('tasks.json', data);
  logger.info('Persistence', `Saved ${data.tasks.length} tasks`);
}

export async function loadTasks(): Promise<{ list: TaskList; maxId: number } | null> {
  const data = await loadJsonFile('tasks.json');
  if (!data?.tasks) return null;

  const tasks: Task[] = data.tasks.map((td: any) => {
    const t = new Task(td.id);
    t.title = td.title || '';
    t.content = td.content || '';
    t.completed = td.completed || false;
    t.flagged = td.flagged || false;
    t.priority = td.priority;
    t.tags = td.tags || [];
    t.schedule = migrateSchedule(td.schedule) || undefined;
    t.updatedAt = td.updatedAt || undefined;
    t.indent = td.indent || 0;
    return t;
  });

  const maxTaskId = tasks.length > 0 ? Math.max(...tasks.map((t) => t.id)) : 0;
  const maxId = Math.max(data.maxId || 0, maxTaskId) + 1;
  setMaxId(maxId);

  return { list: new TaskList(tasks), maxId };
}
