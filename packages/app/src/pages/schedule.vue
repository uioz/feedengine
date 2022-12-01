<template>
  <VContainer>
    <VToolbar title="手动执行">
      <VBtn icon="add_task"></VBtn>
    </VToolbar>
    <ManualTable></ManualTable>
    <VDivider class="my-5"></VDivider>
    <VToolbar title="定时执行">
      <VBtn icon="add_task"></VBtn>
    </VToolbar>
    <VDivider class="my-5"></VDivider>
    <VToolbar title="启动时执行">
      <VBtn icon="add_task"></VBtn>
    </VToolbar>
  </VContainer>
</template>
<script setup lang="ts">
import {useScheduleStore} from '@/stores/schedule';
import ManualTable from '@/components/schedule/ManualTable.vue';

const {fetch} = useScheduleStore();

fetch();
</script>
