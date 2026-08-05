import { describe, it, expect } from 'vitest';
import { Task } from '../../domain/task';
import { computeGroupBox } from '../group-box';

function tasks(list: Array<[number, number]>): Task[] {
    return list.map(([id, indent]) => {
        const t = new Task(id);
        t.indent = indent;
        return t;
    });
}

describe('computeGroupBox — 当前定位组范围', () => {
    it('选中顶级任务：框住它和它后面的连续子任务', () => {
        const ts = tasks([[1, 0], [2, 1], [3, 1], [4, 0]]);
        expect(computeGroupBox(ts, ts[0])).toEqual({ startId: 1, endId: 3 });
    });

    it('选中子任务：框住它的主任务和整个子任务组', () => {
        const ts = tasks([[1, 0], [2, 1], [3, 1], [4, 0]]);
        expect(computeGroupBox(ts, ts[2])).toEqual({ startId: 1, endId: 3 });
    });

    it('顶级任务无子任务：不显示框', () => {
        const ts = tasks([[1, 0], [2, 0]]);
        expect(computeGroupBox(ts, ts[0])).toBeNull();
    });

    it('独立子任务组（中间顶级任务后）', () => {
        const ts = tasks([[1, 0], [2, 0], [3, 1], [4, 0]]);
        expect(computeGroupBox(ts, ts[1])).toEqual({ startId: 2, endId: 3 });
    });

    it('列表不足 2 行或不选中：不显示框', () => {
        expect(computeGroupBox(tasks([[1, 0]]), tasks([[1, 0]])[0])).toBeNull();
        expect(computeGroupBox(tasks([[1, 0], [2, 1]]), null)).toBeNull();
    });
});
