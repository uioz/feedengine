<template>
  <div>
    <VTabs v-model="tab">
      <VTab value="local">本地</VTab>
      <VTab value="market">市场</VTab>
    </VTabs>
    <VWindow v-model="tab">
      <VWindowItem value="local">
        <Local></Local>
      </VWindowItem>
      <VWindowItem value="market">
        <Market></Market>
      </VWindowItem>
    </VWindow>
  </div>
</template>
<script setup lang="ts">
import {ref} from 'vue';
import Local from '@/components/plugin/Local.vue';
import Market from '@/components/plugin/Market.vue';

const tab = ref('local');
</script>
