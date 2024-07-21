<template>
  <div>
    <el-text>Current Mode: {{ EditorMode[editorMode] }}</el-text>
  </div>
</template>

<script setup lang="ts">
import { EditorMode } from '../domain/editor';
import { editorStore } from '../store/editor'

const { mode: editorMode } = editorStore()
</script>

<style scoped></style>