<template>
  <div v-if="lastline.isShown" class="search-box">
    <el-input v-model="lastline.content" ref="inputRef" placeholder="Command" prefix-icon="el-icon-search"
      clearable></el-input>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref, watch, nextTick } from 'vue';
import { lastlineStore } from '../store/lastline';

const lastline = lastlineStore();
const inputRef = ref<any>(null);

onMounted(() => {
  watch(() => lastline.focus, (newValue, oldValue) => {
    if (!oldValue && newValue) {
      nextTick(() => {
        if (inputRef.value) {
          inputRef.value.focus();
        }
      });
    } else if (oldValue && !newValue) {
      inputRef.value.blur();
    }
  });
});
</script>

<style scoped>
.search-box {
  position: fixed;
  bottom: 15px;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
  z-index: 1000;
  padding: 10px;
  border-radius: 4px;
  /* 白色文本 */
}
</style>