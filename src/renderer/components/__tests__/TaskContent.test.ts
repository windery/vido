import { describe, expect, it } from 'vitest';
import { nextTick } from 'vue';
import { mount } from '@vue/test-utils';
import TaskContent from '../TaskContent.vue';
import { Task, TaskState } from '../../domain/task';
import { store } from '../../domain/state/store';

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

  it('导航态 textarea readonly（阻止中文输入法激活）', () => {
    const wrapper = mountContent(makeTask());
    expect((wrapper.find('.content-editor').element as HTMLTextAreaElement).readOnly).toBe(true);
  });

  it('编辑态 textarea 可编辑（IME 可输入）', () => {
    const t = makeTask({ status: TaskState.CONTENT_EDITING });
    const wrapper = mountContent(t);
    expect((wrapper.find('.content-editor').element as HTMLTextAreaElement).readOnly).toBe(false);
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

describe('TaskContent — Ctrl+V 可视块选区覆盖层', () => {
  it('块模式激活：块内字符渲染 bm-sel 高亮，块前行透明占位', () => {
    store.state.visual = { active: true, kind: 'block', anchorLine: 0, anchorCol: 0 };
    try {
      // 锚点 (0,0)、光标 (1,2) → 块 = 行 0..1 × 列 0..2
      const wrapper = mountContent(makeTask({ cursorLine: 1, cursorColumn: 2 }));
      expect(wrapper.find('.block-mirror').exists()).toBe(true);
      const sels = wrapper.findAll('.bm-sel').map((s) => s.text());
      expect(sels).toEqual(['lin', 'lin']); // 'line1'/'line2' 前 3 字符
      // 多行结构：镜像层按行渲染（含真实换行），高亮绝不被压到第一行
      expect(wrapper.find('.block-mirror').element.textContent).toContain('\n');
    } finally {
      store.state.visual = { active: false, kind: 'block', anchorLine: 0, anchorCol: 0 };
    }
  });

  it('块模式未激活：不渲染覆盖层', () => {
    store.state.visual = { active: false, kind: 'block', anchorLine: 0, anchorCol: 0 };
    const wrapper = mountContent(makeTask({ cursorLine: 1, cursorColumn: 2 }));
    expect(wrapper.find('.block-mirror').exists()).toBe(false);
  });
});

describe('TaskContent — 进入 nav/edit 态自动撑高（adjustHeight 触发）', () => {
  it('content 变更（非 input 路径）触发 watchEffect → textarea inline height 更新', async () => {
    const t = makeTask();
    const wrapper = mountContent(t);
    // 模拟初始 scrollHeight 66（3 行 × 22px）
    await nextTick();
    await nextTick();
    const ta = wrapper.find('.content-editor').element as HTMLTextAreaElement;
    Object.defineProperty(ta, 'scrollHeight', { value: 66, configurable: true });
    // dd/x/undo 等通过 store 改 content，:value 更新但无 input 事件 → 高度必须重算
    await wrapper.setProps({ task: { ...t, content: 'line1\nline2\nline3' } });
    await nextTick();
    await nextTick();
    expect(ta.style.height).toBe('66px');
  });

  it('从 normal（SELECTED）切到 nav（CONTENT_NAVIGATION）时新挂载 textarea 被撑高', async () => {
    const t = makeTask({ status: TaskState.SELECTED });
    const wrapper = mountContent(t);
    expect(wrapper.find('.content-editor').exists()).toBe(false); // normal：markdown 分支
    await wrapper.setProps({ task: { ...t, status: TaskState.CONTENT_NAVIGATION } }); // i 键进入
    const ta = wrapper.find('.content-editor').element as HTMLTextAreaElement;
    Object.defineProperty(ta, 'scrollHeight', { value: 88, configurable: true });
    await wrapper.setProps({ task: { ...t, status: TaskState.CONTENT_NAVIGATION } }); // 触发重算
    await nextTick();
    await nextTick();
    expect(ta.style.height).toBe('88px'); // 不再停留在固有 2 行默认高度
  });
});
