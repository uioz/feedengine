<template>
  <td>{{ name ?? `${plugin}@${task}@${taskId}` }}</td>
  <td>
    <p>{{ plugin }}</p>
    <p>{{ task }}</p>
  </td>
  <td>{{ getStateText(state) }}</td>
  <td>{{ getLastRunText(lastRun) }}</td>
</template>
<script setup lang="ts">
import type {Schedule} from 'feedengine';

enum TaskState {
  pending = 0,
  running = 1,
  finished = 2,
  error = 3,
}

const TaskStateTextMap = {
  [TaskState.pending]: '排队等待',
  [TaskState.running]: '执行中',
  [TaskState.finished]: '执行成功',
  [TaskState.error]: '执行失败',
} as const;

function getStateText(state: Schedule['state']) {
  if (state === undefined) {
    return 'N/A';
  }

  return TaskStateTextMap[state];
}

function getLastRunText(lastRun: Schedule['lastRun']) {
  if (lastRun === null) {
    return 'N/A';
  }

  return new Date(lastRun).toLocaleString();
}

defineProps<{
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
</script>
