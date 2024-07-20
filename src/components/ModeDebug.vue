<template>
  <div>
    <el-text>Current Mode: {{ editorMode }}</el-text>
  </div>
</template>

<script setup lang="ts">
import { editorStore } from '../store/editor'

const { mode: editorMode } = editorStore()
</script>

<style scoped></style>