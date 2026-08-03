import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskItem from '../TaskItem.vue';
import { Task, TaskPriority } from '../../domain/task';
import { createSpecificDateSchedule } from '../../utils/schedule-helper';

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
    expect(header.text()).toContain('日程');
    expect(header.find('.config-header-phase').text()).toBe('');
  });

  it('priority-select：图标 ! + 标题「优先级」', () => {
    const wrapper = mountItem(makeTask({ configState: 'priority-select' }));
    const header = wrapper.find('.config-header');
    expect(header.find('.config-header-icon').text()).toBe('!');
    expect(header.find('.config-header-icon').classes()).toContain('cfg-priority');
    expect(header.text()).toContain('优先级');
  });

  it('tags-select：图标 # + 标题「标签」', () => {
    const wrapper = mountItem(makeTask({ configState: 'tags-select' }));
    const header = wrapper.find('.config-header');
    expect(header.find('.config-header-icon').text()).toBe('#');
    expect(header.find('.config-header-icon').classes()).toContain('cfg-tags');
    expect(header.text()).toContain('标签');
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
