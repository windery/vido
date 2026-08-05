import { describe, expect, it, beforeEach } from 'vitest';
import { mount } from '@vue/test-utils';
import { nextTick } from 'vue';
import TaskItem from '../TaskItem.vue';
import { Task, TaskPriority } from '../../domain/task';
import { createSpecificDateSchedule } from '../../utils/schedule-helper';
import { store } from '../../domain/state/store';

function makeTask(overrides: Partial<Task> = {}): Task {
  const t = new Task(1);
  t.title = '测试任务';
  Object.assign(t, overrides);
  return t;
}

function mountItem(task: Task) {
  return mount(TaskItem, {
    props: { task, index: 0 },
    global: { stubs: { TaskContent: true } },
  });
}

describe('TaskItem 信息符号渲染', () => {
  it('行首渲染完成状态圈：未完成 ○ / 已完成 ✓', () => {
    const undone = mountItem(makeTask({ completed: false }));
    expect(undone.text()).toContain('○');
    expect(undone.find('.status-indicator.done').exists()).toBe(false);

    const done = mountItem(makeTask({ completed: true }));
    expect(done.text()).toContain('✓');
    expect(done.find('.status-indicator.done').exists()).toBe(true);
  });

  it('优先级用 !!!/!!/! 符号而非 P1/P2/P3 文字', () => {
    const high = mountItem(makeTask({ priority: TaskPriority.HIGH }));
    expect(high.find('.priority-indicator').text()).toBe('!!!');
    expect(high.text()).not.toContain('P1');

    const medium = mountItem(makeTask({ priority: TaskPriority.MEDIUM }));
    expect(medium.find('.priority-indicator').text()).toBe('!!');

    const low = mountItem(makeTask({ priority: TaskPriority.LOW }));
    expect(low.find('.priority-indicator').text()).toBe('!');
  });

  it('未设置优先级时不占位（标题紧跟编号）', () => {
    const wrapper = mountItem(makeTask({ priority: undefined }));
    expect(wrapper.find('.priority-indicator').exists()).toBe(false);
  });

  it('旗标 ⚑ 仅在 flagged 时渲染', () => {
    const flagged = mountItem(makeTask({ flagged: true }));
    expect(flagged.find('.flag-indicator').exists()).toBe(true);
    expect(flagged.find('.flag-indicator').text()).toBe('⚑');

    const unflagged = mountItem(makeTask({ flagged: false }));
    expect(unflagged.find('.flag-indicator').exists()).toBe(false);
  });

  it('标签以 #tag 内联 chip 常驻渲染于 meta 行', () => {
    const wrapper = mountItem(makeTask({ tags: ['work', 'urgent'] }));
    const meta = wrapper.find('.task-meta');
    expect(meta.exists()).toBe(true);
    expect(meta.text()).toContain('#work');
    expect(meta.text()).toContain('#urgent');

    const noTags = mountItem(makeTask({ tags: [] }));
    expect(noTags.find('.task-meta').exists()).toBe(false);
  });

  it('日程以 @ 前缀渲染于 meta 行', () => {
    const wrapper = mountItem(makeTask({ schedule: createSpecificDateSchedule('2026-08-04') }));
    expect(wrapper.find('.task-meta').text()).toContain('@');
    expect(wrapper.find('.task-meta').text()).toContain('2026-08-04');
  });
});

describe('TaskItem 配置面板标题条', () => {
  it('schedule-select：图标 @ + 标题「日程」', () => {
    const wrapper = mountItem(makeTask({ configState: 'schedule-select' }));
    const header = wrapper.find('.config-header');
    expect(header.exists()).toBe(true);
    expect(header.find('.config-header-icon').text()).toBe('@');
    expect(header.find('.config-header-icon').classes()).toContain('cfg-schedule');
    expect(header.text()).toContain('Schedule');
    expect(header.find('.config-header-phase').text()).toBe('');
  });

  it('priority-select：图标 ! + 标题「优先级」', () => {
    const wrapper = mountItem(makeTask({ configState: 'priority-select' }));
    const header = wrapper.find('.config-header');
    expect(header.find('.config-header-icon').text()).toBe('!');
    expect(header.find('.config-header-icon').classes()).toContain('cfg-priority');
    expect(header.text()).toContain('Priority');
  });

  it('tags-select：图标 # + 标题「标签」', () => {
    const wrapper = mountItem(makeTask({ configState: 'tags-select' }));
    const header = wrapper.find('.config-header');
    expect(header.find('.config-header-icon').text()).toBe('#');
    expect(header.find('.config-header-icon').classes()).toContain('cfg-tags');
    expect(header.text()).toContain('Tags');
  });

  it('edit 态显示 EDIT 相位角标', () => {
    const wrapper = mountItem(makeTask({ configState: 'schedule-edit' }));
    expect(wrapper.find('.config-header-phase').text()).toBe('EDIT');
  });

  it('无 configState 时不渲染面板标题条', () => {
    const wrapper = mountItem(makeTask({ configState: undefined }));
    expect(wrapper.find('.config-header').exists()).toBe(false);
    expect(wrapper.find('.config-panel').exists()).toBe(false);
  });
});

describe('TaskItem 标签配置：编号与删除高亮', () => {
  beforeEach(() => {
    store.setTagDeleteIndex(0);
  });

  it('标签 chip 前缀编号（d+序号 的删除目标）', () => {
    const wrapper = mountItem(makeTask({ configState: 'tags-select', tags: ['work', 'urgent'] }));
    const chips = wrapper.findAll('.config-tag');
    expect(chips.length).toBe(2);
    expect(chips[0].find('.config-tag-idx').text()).toBe('1');
    expect(chips[1].find('.config-tag-idx').text()).toBe('2');
  });

  it('tagDeleteIndex 匹配的标签高亮（config-tag-del + ✕ 标记）', async () => {
    const wrapper = mountItem(makeTask({ configState: 'tags-select', tags: ['a', 'b', 'c'] }));
    store.setTagDeleteIndex(2);
    await nextTick();

    const chips = wrapper.findAll('.config-tag');
    expect(chips[1].classes()).toContain('config-tag-del');
    expect(chips[1].find('.config-tag-x').exists()).toBe(true);
    expect(chips[0].find('.config-tag-x').exists()).toBe(false);
  });

  it('无删除目标时不带高亮样式', async () => {
    const wrapper = mountItem(makeTask({ configState: 'tags-select', tags: ['a', 'b'] }));
    store.setTagDeleteIndex(0);
    await nextTick();

    const chips = wrapper.findAll('.config-tag');
    expect(chips.every((c) => !c.classes().includes('config-tag-del'))).toBe(true);
  });

  it('删除提示行显示', () => {
    const wrapper = mountItem(makeTask({ configState: 'tags-select', tags: ['a'] }));
    expect(wrapper.find('.config-tags-hint').text()).toContain('delete');
  });
});

describe('TaskItem 子任务缩进渲染', () => {
  it('子任务：container 整体右移（margin-left = indent×24px），引导线画在缩进轨道', () => {
    const sub = mountItem(makeTask({ indent: 2 }));
    const container = sub.find('.task-container');
    expect(container.attributes('style')).toContain('margin-left: 48px'); // 2×24，整行右移
    // task-line 本身不再 padding 缩进（背景/高亮不覆盖缩进轨道）
    const line = sub.find('.task-line');
    expect(line.attributes('style') || '').not.toContain('padding-left');
    // 引导线：左侧轨道宽 48px
    const guide = sub.find('.indent-guide');
    expect(guide.exists()).toBe(true);
    expect(guide.attributes('style')).toContain('width: 48px');
    expect(guide.attributes('style')).toContain('left: -48px');
  });

  it('顶级任务：无缩进、无引导线、行号不弱化', () => {
    const top = mountItem(makeTask({ indent: 0 }));
    const container = top.find('.task-container');
    expect(container.attributes('style')).toContain('margin-left: 0px'); // 顶级无缩进
    expect(top.find('.indent-guide').exists()).toBe(false);
    expect(top.find('.task-line').classes()).not.toContain('subtask');
  });

  it('子任务行带 subtask class（行号弱化）', () => {
    const sub = mountItem(makeTask({ indent: 1 }));
    expect(sub.find('.task-line').classes()).toContain('subtask');
  });
});
