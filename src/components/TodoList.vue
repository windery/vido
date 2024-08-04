<template>
  <el-table class="task-table" :data="tasks" :row-class-name="rowClassName" @row-click="handleRowClick">
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
import { taskStore } from '../store/task';

const { tasks, selectTask } = taskStore();

const rowClassName = (row: { row: any, rowIndex: number }) => {
  return row.row.selected ? 'selected-row' : '';
};

const handleRowClick = (row: any, column: any, event: Event) => {
  console.log('Row clicked:', row);
  selectTask(row.id);
};

</script>

<style>
.task-table {
  width: 100%;
  height: 100%;
  margin-top: 20px;
}

.el-table__row.selected-row {
  background-color: #E3F2FD !important;
}
</style>
