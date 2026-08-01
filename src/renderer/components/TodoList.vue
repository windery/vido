<template>
    <div class="vim-editor">
        <div class="vim-container">
            <!-- Vim Header -->
            <VimHeader :filtered-tasks-count="filteredTasks.length" :completed-tasks-count="completedTasksCount" />

            <!-- Main editing area -->
            <div class="vim-content">
                <!-- Empty Buffer -->
                <EmptyBuffer v-if="filteredTasks.length === 0" :is-searching="isSearching" />

                <!-- Task List -->
                <div v-else class="buffer-content">
                    <TaskItem v-for="(task, index) in filteredTasks" :key="task.id" :task="task" :index="index"
                        :search-term="searchTerm"
                        @row-click="handleRowClick" @start-title-editing="startTaskTitleEditing"
                        @title-input="handleTitleInput" @cursor-update="handleCursorUpdate"
                        @content-keydown="handleContentKeydown" @content-input="handleContentInput"
                        @textarea-ref="registerTextareaRef" />
                </div>
            </div>
        </div>
    </div>
</template>

<script setup lang="ts">
import { nextTick, onMounted, computed, watchEffect, ref, watch } from 'vue';
import { Task, TaskState } from '../domain/task';
import { useTaskState } from '../composables/use-task-state';
import { getKeyboardManager } from '../domain/keyboard/keyboard-manager';
import { logger } from '../utils/logger';

// Components
import VimHeader from './VimHeader.vue';
import EmptyBuffer from './EmptyBuffer.vue';
import TaskItem from './TaskItem.vue';

// 使用统一状态管理架构
const {
    selectedTask,
    filteredTasks,
    isSearching,
    lastlineContent,
    selectTask,
    startTitleEditing,
    updateCursorPosition,
    updateContentWithCursor
} = useTaskState();

const completedTasksCount = computed(() => {
    return filteredTasks.value.filter((task: Task) => task.completed).length;
});

// 搜索关键词：提取 /xxx 中的 xxx，用于任务标题高亮
const searchTerm = computed(() => {
    const f = lastlineContent.value;
    return f && f.startsWith('/') && f.length > 1 ? f.slice(1) : '';
});

// 用于存储多个内容编辑textarea的refs
const contentEditRefs = ref<Map<number, HTMLTextAreaElement>>(new Map());

// Force reactivity for cursor position changes
const cursorTracker = computed(() => {
    const task = selectedTask.value;
    if (task && task.status === TaskState.CONTENT_NAVIGATION) {
        const line = task.cursorLine ?? 0;
        const column = task.cursorColumn ?? 0;
        return `${task.id}-${line}-${column}`;
    }
    return '';
});

// Watch for cursor changes to update cursor display
watchEffect(() => {
    void cursorTracker.value;

    const task = selectedTask.value;
    // 只在有选中任务时才记录日志，避免初始化时的undefined日志
    if (task && task.status === TaskState.CONTENT_NAVIGATION) {
        if (task.cursorLine !== undefined && task.cursorColumn !== undefined) {
            // 找到对应的textarea并更新光标
            nextTick(() => {
                const textarea = contentEditRefs.value.get(task.id);
                if (textarea) {
                    updateContentWithCursorLocal(textarea, task);
                    logger.debug('TodoListRefactored', `Updated cursor for task ${task.id} at line ${task.cursorLine}, column ${task.cursorColumn}`);
                } else {
                    logger.warn('TodoListRefactored', `No textarea found for task ${task.id}`);
                }
            });
        } else {
            logger.warn('TodoListRefactored', `Task ${task.id} has undefined cursor position`);
        }
    }
});

const handleRowClick = (task: Task) => {
    selectTask(task.id);
    scrollToTask(task.id);
};

const startTaskTitleEditing = (task: Task) => {
    selectTask(task.id);
    startTitleEditing();
};

const handleTitleInput = (value: string, task: Task) => {
    // 通过状态管理器正确更新任务标题
    const taskState = useTaskState();
    taskState.taskDataManager.updateTaskProperty(task.id, 'title', value);
};

const handleContentInput = (value: string, task: Task) => {
    const taskState = useTaskState();
    taskState.taskDataManager.updateTaskProperty(task.id, 'content', value);
};

const handleCursorUpdate = (event: Event, task: Task) => {
    // 只在编辑模式下更新光标位置
    if (task.status === TaskState.CONTENT_EDITING) {
        const textarea = event.target as HTMLTextAreaElement;
        const cursorPosition = textarea.selectionStart;
        const content = textarea.value;
        const lines = content.split('\n');

        let line = 0;
        let column = 0;
        let charCount = 0;

        for (let i = 0; i < lines.length; i++) {
            const lineLength = lines[i].length + 1; // +1 for newline
            if (charCount + lineLength > cursorPosition) {
                line = i;
                column = cursorPosition - charCount;
                break;
            }
            charCount += lineLength;
        }

        // 更新光标位置到状态管理器
        updateCursorPosition(line, column);
    }
};

const handleContentKeydown = (event: KeyboardEvent, task: Task) => {
    // 在内容导航模式下，阻止所有文本输入
    if (task.status === TaskState.CONTENT_NAVIGATION) {
        // 允许的导航键
        const allowedKeys = ['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown'];

        // 如果不是允许的键，阻止默认行为
        if (!allowedKeys.includes(event.key) && !event.metaKey && !event.ctrlKey) {
            event.preventDefault();
        }
    }
};

const updateContentWithCursorLocal = (textarea: HTMLTextAreaElement, task: Task) => {
    if (task.cursorLine === undefined || task.cursorColumn === undefined) {
        logger.warn('TodoListRefactored', `updateContentWithCursor: missing cursor position for task ${task.id}`);
        return;
    }

    const lines = (task.content || '').split('\n');
    // 确保光标行存在
    while (lines.length <= task.cursorLine) {
        lines.push('');
    }

    // 计算光标偏移（字符位置）
    let offset = 0;
    for (let i = 0; i < task.cursorLine; i++) {
        offset += lines[i].length + 1; // +1 for newline
    }
    offset += Math.min(task.cursorColumn, lines[task.cursorLine].length);

    // 移动原生闪烁 caret 到光标位置，不再注入空格占位
    textarea.setSelectionRange(offset, offset);
};

const scrollToTask = (taskId: number) => {
    nextTick(() => {
        setTimeout(() => {
            const taskElement = document.querySelector(`[data-task-id="${taskId}"]`);
            if (taskElement) {
                // 检查任务是否有内容区域
                const contentArea = taskElement.querySelector('.task-content-area');
                if (contentArea) {
                    // 如果有内容区域，确保整个容器（包括内容）都可见
                    const container = taskElement.closest('.vim-content') as HTMLElement;
                    if (container) {
                        const containerRect = container.getBoundingClientRect();
                        const taskRect = taskElement.getBoundingClientRect();
                        const contentRect = contentArea.getBoundingClientRect();

                        // 计算任务和内容的总高度
                        const totalHeight = contentRect.bottom - taskRect.top;
                        const containerHeight = containerRect.height;

                        // 如果总高度超过容器高度，滚动到任务顶部
                        if (totalHeight > containerHeight * 0.8) {
                            taskElement.scrollIntoView({
                                behavior: 'auto',
                                block: 'start'
                            });
                        } else {
                            // 否则居中显示
                            taskElement.scrollIntoView({
                                behavior: 'auto',
                                block: 'center'
                            });
                        }
                    }
                } else {
                    // 没有内容区域，正常居中显示
                    taskElement.scrollIntoView({
                        behavior: 'auto',
                        block: 'center'
                    });
                }
            }
        }, 50); // 给DOM一点时间更新
    });
};

// 将滚动函数添加到全局，以便键盘导航也能使用
(window as any).scrollToSelectedTask = () => {
    const selected = selectedTask.value;
    if (selected?.id) {
        scrollToTask(selected.id);
    }
};

// 监听selectedTask变化，处理状态转换
watch(selectedTask, (newTask, oldTask) => {
    // 如果选中的任务发生变化，滚动到新任务
    if (newTask && newTask.id !== oldTask?.id && newTask.id) {
        scrollToTask(newTask.id);
    }

    // 处理不同状态的转换
    if (newTask && newTask.status === TaskState.CONTENT_NAVIGATION) {
        nextTick(() => {
            logger.debug('TodoListRefactored', 'focus on task, start content navigation', { taskId: newTask.id });

            // 使用更长的延迟确保DOM完全渲染
            setTimeout(() => {
                // 先尝试从refs获取textarea
                let contentTextarea = contentEditRefs.value.get(newTask.id);

                // 如果refs中没有，尝试从DOM查找
                if (!contentTextarea) {
                    const textareaElement = document.querySelector(`[data-task-id="${newTask.id}"] .content-editor`);
                    if (textareaElement instanceof HTMLTextAreaElement) {
                        contentTextarea = textareaElement;
                        // 更新refs
                        contentEditRefs.value.set(newTask.id, contentTextarea);
                    }
                }

                if (contentTextarea) {
                    // 确保textarea可见
                    contentTextarea.style.display = 'block';
                    contentTextarea.style.visibility = 'visible';

                    // 先调整高度
                    contentTextarea.style.height = 'auto';
                    contentTextarea.style.height = `${contentTextarea.scrollHeight}px`;

                    // 设置焦点
                    contentTextarea.focus();

                    // 在内容导航模式下显示光标
                    if (newTask.cursorLine !== undefined && newTask.cursorColumn !== undefined) {
                        updateContentWithCursor(newTask.id);
                    } else {
                        // 设置默认光标位置
                        newTask.cursorLine = 0;
                        newTask.cursorColumn = 0;
                        updateContentWithCursor(newTask.id);
                    }
                } else {
                    logger.error('TodoListRefactored', 'Could not find textarea for task', newTask.id);
                }

                // 确保内容区域也在可见范围内
                scrollToTask(newTask.id);
            }, 10); // 减少延迟到10ms，提高响应速度
        });
    }
}, { deep: true });

// 注册 textarea 引用的方法
const registerTextareaRef = (taskId: number, textarea: HTMLTextAreaElement | null) => {
    if (textarea) {
        contentEditRefs.value.set(taskId, textarea);
    } else {
        contentEditRefs.value.delete(taskId);
    }
};

onMounted(() => {
    logger.debug('TodoListRefactored', 'Component mounted');

    // 注入滚动回调到键盘管理器，HMR 重渲染时重新注册
    const km = getKeyboardManager();
    km.setScrollCallback(() => {
        (window as any).scrollToSelectedTask?.();
    });

    // 监听保存光标位置事件
    document.addEventListener('save-cursor-position', (event: any) => {
        const taskId = event.detail.taskId;
        const task = filteredTasks.value.find((t: Task) => t.id === taskId);
        const textarea = contentEditRefs.value.get(taskId);
        if (task && textarea) {
            // 计算行列
            const cursorPosition = textarea.selectionStart;
            const content = textarea.value;
            const lines = content.split('\n');
            let line = 0, column = 0, charCount = 0;
            for (let i = 0; i < lines.length; i++) {
                const lineLength = lines[i].length + 1;
                if (charCount + lineLength > cursorPosition) {
                    line = i;
                    column = cursorPosition - charCount;
                    break;
                }
                charCount += lineLength;
            }
            task.cursorLine = line;
            task.cursorColumn = column;
            logger.debug('TodoListRefactored', `Saved cursor position for task ${taskId}`, { line, column });
        }
    });
});
</script>

<style scoped>
.vim-editor {
    height: calc(100vh - 60px);
    /* Leave space for status line and padding */
    display: flex;
    flex-direction: column;
    background: var(--bg);
    color: var(--text);
    font-family: 'SF Mono', 'Monaco', 'Inconsolata', 'Roboto Mono', monospace;
    font-size: 14px;
    line-height: 1.4;
    width: 100vw;
    max-width: 100vw;
    overflow-x: hidden;
    box-sizing: border-box;
}

.vim-container {
    width: 100%;
    max-width: calc(100vw - 32px);
    margin: 0 auto;
    padding: 0 12px;
    box-sizing: border-box;
    display: flex;
    flex-direction: column;
    height: 100%;
    gap: 2px;
}

/* Main content area */
.vim-content {
    flex: 1;
    overflow-y: auto;
    overflow-x: hidden;
    background: var(--bg);
    border-radius: 0 0 4px 4px;
    border: 1px solid var(--border);
    border-top: none;
}

/* Buffer content */
.buffer-content {
    padding: 16px 12px 16px 8px;
}
</style>
