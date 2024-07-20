<template>
  <el-table class="task-table" :data="tasks">
    <el-table-column label="id" prop="id"> </el-table-column>
    <el-table-column label="text" prop="text"> </el-table-column>
  </el-table>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const tasks = ref([
  { id: 1, text: 'Learn JavaScript' },
  { id: 2, text: 'Learn Vue' },
  { id: 3, text: 'Build something awesome' },
]);
</script>

<style scoped>
.read-the-docs {
  color: #888;
}

.task-table {
  width: 100%;
  height: 100%;
  margin-top: 20px;
}
</style>
