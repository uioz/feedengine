<template>
  <CommonRow v-bind="props"></CommonRow>
  <td>{{ trigger }}</td>
  <td class="text-center">
    <VBtn size="x-small" variant="text" icon="delete" @click="handleDelete"></VBtn>
  </td>
</template>
<script setup lang="ts">
import type {Schedule} from 'feedengine';
import {useSchedule} from './ManualTable';
import CommonRow from './CommonRow.vue';

const props = defineProps<{
  id: Schedule['id'];
  taskId: Schedule['taskId'];
  type: Schedule['type'];
  lastRun: Schedule['lastRun'];
  createdAt: Schedule['createdAt'];
  trigger: Schedule['trigger'];
  state?: Schedule['state'];
  plugin: Schedule['plugin'];
  task: Schedule['task'];
  name: Schedule['name'];
}>();

const {handleDelete} = useSchedule(props);
</script>
