<template>
  <el-table ref="tableRef" class="task-table" :data="filteredTasks" @row-click="handleRowClick"
    :header-row-style="{ display: 'none' }" highlight-current-row>
    <el-table-column label="Completed" prop="completed">
      <template #default="{ row }">
        <el-checkbox v-model="row.completed"></el-checkbox>
      </template>
    </el-table-column>
    <el-table-column label="Title" prop="title"> </el-table-column>
    <el-table-column label="Content" prop="content"> </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue';
import { taskStore } from '../store/task';
import { storeToRefs } from 'pinia';

const { filteredTasks, selectedTask } = storeToRefs(taskStore());
const selectTask = taskStore().selectTask;

const tableRef = ref<InstanceType<typeof import('element-plus')['ElTable']> | null>(null);

const handleRowClick = (row: any) => {
  console.log('Row clicked:', row);
  selectTask(row.id);
  if (tableRef.value) {
    console.log('task table set current row:', row.id);
    tableRef.value.setCurrentRow(row);
  } else {
    console.warn('task table tableRef is null');
  }
};


watch(selectedTask, () => {
  if (tableRef.value) {
    console.log('task table set current row:', selectedTask.value.id);
    tableRef.value.setCurrentRow(selectedTask.value);
  } else {
    console.warn('tableRef is null');
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
