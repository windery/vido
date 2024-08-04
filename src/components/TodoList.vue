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

const tasks = ref(taskStore().tasks);

const rowClassName = (row: { row: any, rowIndex: any }) => {
  console.log('row', row);
  if (row.rowIndex == 0) {
    console.log('black-row');
    return 'black-row';
  }
};

</script>

<style>
.task-table {
  width: 100%;
  height: 100%;
  margin-top: 20px;
}

.black-row {
  background-color: #874c4c;
}
</style>
