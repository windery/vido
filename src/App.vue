<script setup lang="ts">
import ModeDebug from "./components/ModeDebug.vue";
import TodoList from "./components/TodoList.vue";
</script>

<template>
  <div class="app">
    <el-row>
      <ModeDebug />
    </el-row>
    <el-row>
      <TodoList />
    </el-row>
  </div>
</template>

<style>
.flex-center {
  display: flex;
  align-items: center;
  justify-content: center;
}

.app {
  height: 100vh;
  /* 视口高度 */
  width: 100vw;
  /* 视口宽度 */
  margin: 0;
  padding: 0;
  overflow: hidden;
  /* 防止滚动条 */
}
</style>
