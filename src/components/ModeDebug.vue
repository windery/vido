<template>
  <div>
    <el-text class="editor-mode">{{ EditorMode[editorMode] }}</el-text>
  </div>
</template>

<script setup lang="ts">
import { EditorMode } from '../domain/editor';
import { editorStore } from '../store/editor'

const { mode: editorMode } = editorStore()
</script>

<style scoped>
.editor-mode {
  font-size: small;
  position: fixed;
  top: 10px;
  right: 10px;
  background-color: rgba(133, 120, 120, 0.200);
  /* 浅色背景，带有透明度 */
  color: #333;
  /* 深色文字 */
  padding: 2px 5px;
  border-radius: 8px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  /* 轻微的阴影 */
  z-index: 9999;
  /* 确保在其他元素之上 */
}
</style>