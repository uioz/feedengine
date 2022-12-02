<template>
  <VContainer>
    <VSheet v-for="item of list" :key="item.type" rounded="lg" class="mb-2">
      <VToolbar rounded="lg" :title="item.label">
        <VBtn
          :variant="(ScheduleStore as any)[item.type].length ? 'plain' : 'elevated'"
          icon="add_task"
        ></VBtn>
      </VToolbar>
      <component :is="item.component" :type="item.type"></component>
    </VSheet>
  </VContainer>
</template>
<script setup lang="ts">
import {useScheduleStore, ScheduleType} from '@/stores/schedule';
import ManualTable from '@/components/schedule/ManualTable.vue';

const ScheduleStore = useScheduleStore();

ScheduleStore.fetch();

const labelMap = {
  [ScheduleType.manual]: '手动执行',
  [ScheduleType.interval]: '定时执行',
  [ScheduleType.startup]: '启动时执行',
} as const;

const list = [
  {
    type: ScheduleType[ScheduleType.manual],
    component: ManualTable,
    label: labelMap[ScheduleType.manual],
  },
  {
    type: ScheduleType[ScheduleType.interval],
    component: ManualTable,
    label: labelMap[ScheduleType.interval],
  },
  {
    type: ScheduleType[ScheduleType.startup],
    component: ManualTable,
    label: labelMap[ScheduleType.startup],
  },
] as const;
</script>
