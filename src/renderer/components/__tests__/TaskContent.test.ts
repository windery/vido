import { describe, expect, it } from 'vitest';
import { mount } from '@vue/test-utils';
import TaskContent from '../TaskContent.vue';
import { Task, TaskState } from '../../domain/task';

function makeTask(overrides: Partial<Task> = {}): Task {
  const t = new Task(1);
  t.title = 'T';
  t.content = 'line1\nline2\nline3';
  t.selected = true;
  t.status = TaskState.CONTENT_NAVIGATION;
  t.cursorLine = 0;
  t.cursorColumn = 0;
  Object.assign(t, overrides);
  return t;
}

function mountContent(task: Task) {
  return mount(TaskContent, { props: { task } });
}

describe('TaskContent — vim 块光标镜像层', () => {
  it('导航态渲染块光标镜像层', () => {
    const wrapper = mountContent(makeTask());
    expect(wrapper.find('.caret-mirror').exists()).toBe(true);
    expect(wrapper.find('.block-caret').exists()).toBe(true);
  });

  it('镜像前缀 = 光标前的完整文本（跨行含换行）', () => {
    const wrapper = mountContent(makeTask({ cursorLine: 1, cursorColumn: 3 }));
    expect(wrapper.find('.mirror-text').text()).toBe('line1\nlin');
  });

  it('块光标内显示光标处字符', () => {
    const wrapper = mountContent(makeTask({ cursorLine: 1, cursorColumn: 3 }));
    expect(wrapper.find('.block-caret').text()).toBe('e');
  });

  it('空行显示空格块（vim 语义：空行有块光标）', () => {
    const t = makeTask();
    t.content = 'line1\n\nline3';
    t.cursorLine = 1;
    t.cursorColumn = 0;
    const wrapper = mountContent(t);
    // VTU text() 会 trim 空白，用原生 textContent 验证空格块确实占位
    expect(wrapper.find('.block-caret').element.textContent).toBe(' ');
  });

  it('行尾显示空格块', () => {
    const wrapper = mountContent(makeTask({ cursorLine: 0, cursorColumn: 5 }));
    expect(wrapper.find('.block-caret').element.textContent).toBe(' ');
  });

  it('编辑态不渲染镜像层（保留原生竖线光标）', () => {
    const t = makeTask({ status: TaskState.CONTENT_EDITING });
    const wrapper = mountContent(t);
    expect(wrapper.find('.caret-mirror').exists()).toBe(false);
    expect(wrapper.find('.content-editor').exists()).toBe(true);
  });
});
