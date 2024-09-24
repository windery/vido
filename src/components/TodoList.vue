<template>
  <el-table ref="tableRef" class="task-table" :data="filteredTasks" @row-click="handleRowClick"
    :header-row-style="{ display: 'none' }" highlight-current-row row-key="id" :expand-row-keys="expandRowKeys">
    <el-table-column label="Completed" prop="completed">
      <template #default="{ row }">
        <el-checkbox v-model="row.completed"></el-checkbox>
      </template>
    </el-table-column>
    <el-table-column label="Title" prop="title"> </el-table-column>
    <el-table-column type="expand">
      <template #default="{ row: task }">
        <el-input v-if="task.status === TaskState.EDITING" ref="contentEditRef" type="textarea"
          v-model="task.content"></el-input>
        <p v-else>{{ task.content }}</p>
      </template>
    </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { nextTick, ref, watch } from 'vue';
import { taskStore } from '../store/task';
import { storeToRefs } from 'pinia';
import { Task, TaskState } from '../domain/task';

const { filteredTasks, selectedTask } = storeToRefs(taskStore());
const selectTask = taskStore().selectTask;

const tableRef = ref<InstanceType<typeof import('element-plus')['ElTable']> | null>(null);
const contentEditRef = ref<InstanceType<typeof import('element-plus')['ElInput']> | null>(null);

const handleRowClick = (row: Task) => {
  console.log('Row clicked:', row);
  selectTask(row.id);
  if (tableRef.value) {
    console.debug('task table set current row:', row.id);
    tableRef.value.setCurrentRow(row);
  } else {
    console.warn('task table tableRef is null');
  }
};

const expandRowKeys = ref<number[]>([]);
const toggleRowExpansion = (task: Task) => {
  const index = expandRowKeys.value.indexOf(task.id);
  console.debug(`toggleRowExpansion: task ${task.id} ${task.title} - ${index}`);
  expandRowKeys.value.splice(0, 1);
  expandRowKeys.value.push(task.id);
  console.debug('toggleRowExpansion after expandRowKeys:', expandRowKeys.value);
};

watch(selectedTask, (newTask, oldTask) => {
  if (oldTask.selected !== newTask.selected) {
    console.debug('selectedTask changed:', oldTask, newTask);
    if (tableRef.value) {
      console.debug(`task table set current row: taskId ${newTask.id} - taskTitle ${newTask.title}`);
      tableRef.value.setCurrentRow(newTask);
      toggleRowExpansion(newTask);
    } else {
      console.error('task table tableRef is undefined');
    }

  }

  if (newTask.status === TaskState.EDITING) {
    console.log('focus on contentEditRef');
    nextTick(() => {
      contentEditRef?.value?.focus();
    });
  }
}, {
  deep: true,
  // immediate: true,
});

</script>

<style>
.task-table {
  margin-top: 50px;
  width: 100%;
  height: 100%;
}
</style>
