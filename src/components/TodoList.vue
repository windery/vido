<script setup lang="ts">
import { ref } from 'vue';

defineProps({
  msg: {
    type: String,
    default: ''
  },
});

const tasks = ref([
  { id: 1, text: 'Learn JavaScript' },
  { id: 2, text: 'Learn Vue' },
  { id: 3, text: 'Build something awesome' }
]);

</script>

<template>
  <div>
    <el-table v-for="task in tasks" :key="task.id">
      <el-table-column>
        <template #default="{ row }">
          <span>{{ row.id }}</span>
        </template>
      </el-table-column>
      <el-table-column>
        <template #default="{ row }">
          <span>{{ row.text }}</span>
        </template>
      </el-table-column>
    </el-table>
  </div>
</template>

<style scoped>
.read-the-docs {
  color: #888;
}
</style>
