<template>
  <VTable v-if="scheduleStore.startup.length">
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
      <tr v-for="item in scheduleStore.startup" :key="item.id">
        <StartupTableRow v-bind="item"></StartupTableRow>
      </tr>
    </tbody>
  </VTable>
</template>
<script setup lang="ts">
import {useScheduleStore} from '@/stores/schedule';
import StartupTableRow from './StartupTableRow.vue';

const scheduleStore = useScheduleStore();
</script>
