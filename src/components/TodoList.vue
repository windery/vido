<template>
  <el-table class="task-table" :data="tasks" :row-class-name="rowClassName">
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
import { ref } from 'vue';
import { taskStore } from '../store/task';
import { Task } from '../domain/task';

const tasks = ref(taskStore().tasks);

// 定义 rowClassName 函数并直接使用它
const rowClassName = (row: { row: Task }): string => {
  console.log('rowClassName task: ', row.row);
  return row.row.completed ? 'completed-row' : '';
};
</script>

<style scoped>
.task-table {
  width: 100%;
  height: 100%;
  margin-top: 20px;
}

.completed-row {
  background-color: #faf5f5 !important;
  /* 这里添加你的样式 */
}
</style>
