<template>
  <VTable v-if="scheduleStore.manual.length">
    <thead>
      <tr>
        <th class="text-left">名称</th>
        <th class="text-left">插件&任务</th>
        <th class="text-left">状态</th>
        <th class="text-left">上次执行时间</th>
        <th class="text-center" style="width: 100px">操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in scheduleStore.manual" :key="item.id">
        <ManualTableRow v-bind="item"></ManualTableRow>
      </tr>
    </tbody>
  </VTable>
</template>
<script setup lang="ts">
import {useScheduleStore} from '@/stores/schedule';
import ManualTableRow from './ManualTableRow.vue';

const scheduleStore = useScheduleStore();
</script>
