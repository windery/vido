/**
 * 任务持久化测试：saveTasks/loadTasks 字段完整性（indent 缩进层级必须往返）。
 * 背景：indent 曾遗漏在保存字段白名单外，导致子任务缩进重启后丢失。
 */
import { describe, it, expect, vi, beforeEach } from 'vitest';

const { saveJsonFile, loadJsonFile } = vi.hoisted(() => ({
    saveJsonFile: vi.fn(),
    loadJsonFile: vi.fn(),
}));

vi.mock('../../utils/file-operations-ipc', () => ({
    saveJsonFile,
    loadJsonFile,
}));

vi.mock('../../utils/schedule-helper', () => ({
    migrateSchedule: (s: unknown) => s,
}));

import { Task } from '../task';
import { TaskList } from '../entities/task-list';
import { saveTasks, loadTasks } from '../operations/task-persistence';

beforeEach(() => {
    vi.clearAllMocks();
});

function makeTasks(): Task[] {
    const t1 = new Task(1);
    t1.title = 'T1';
    t1.content = 'c1';
    const t2 = new Task(2);
    t2.title = 'T2';
    t2.indent = 1; // 子任务
    return [t1, t2];
}

describe('task-persistence — indent 持久化', () => {
    it('saveTasks 写入 indent 字段', async () => {
        await saveTasks(new TaskList(makeTasks()), 3);
        const payload = saveJsonFile.mock.calls[0][1];
        expect(payload.tasks[1].indent).toBe(1);
        expect(payload.tasks[0].indent).toBe(0);
    });

    it('loadTasks 恢复 indent（子任务缩进不丢失）', async () => {
        loadJsonFile.mockResolvedValueOnce({
            tasks: [
                { id: 1, title: 'T1', indent: 0 },
                { id: 2, title: 'T2', indent: 1 },
            ],
            maxId: 3,
        });
        const result = await loadTasks();
        expect(result?.list.items[1].indent).toBe(1);
        expect(result?.list.items[0].indent).toBe(0);
    });

    it('旧数据无 indent 字段 → 默认 0（兼容）', async () => {
        loadJsonFile.mockResolvedValueOnce({
            tasks: [{ id: 1, title: 'T1' }],
            maxId: 2,
        });
        const result = await loadTasks();
        expect(result?.list.items[0].indent).toBe(0);
    });
});
