<template>
  <VTable v-if="data.length">
    <thead>
      <tr>
        <th class="text-left">名称</th>
        <th class="text-left">插件&任务</th>
        <th class="text-left">状态</th>
        <th class="text-left">上次执行时间</th>
        <th class="text-left">创建时间</th>
        <th class="text-left">操作</th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="item in data" :key="item.id">
        <td>{{ item.name ?? `${item.plugin}@${item.task}@${item.taskId}` }}</td>
        <td>{{ `${item.plugin}@${item.task}` }}</td>
        <td>{{ item.state }}</td>
        <td>{{ item.lastRun }}</td>
        <td>{{ item.createdAt }}</td>
        <td><VBtn rounded="lg" size="small" variant="tonal" icon="play_arrow"></VBtn></td>
      </tr>
    </tbody>
  </VTable>
</template>
<script setup lang="ts">
import {useScheduleStore, ScheduleType} from '@/stores/schedule';
import type {ScheduleRes} from 'feedengine';
import {computed} from 'vue';

const scheduleStore = useScheduleStore();

const props = defineProps<{
  type: ScheduleType;
}>();

const data = computed(() => (scheduleStore as any)[props.type] as ScheduleRes);
</script>
