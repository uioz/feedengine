<template>
  <VContainer>
    <VRow v-for="(value, key) in data" :key="key">
      <VCol>
        <TaskCard :plugin-name="key" :tasks="value"></TaskCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
<script setup lang="ts">
import type {GroupedTasksRes} from 'feedengine';
import TaskCard from '@/components/task/TaskCard.vue';

import {useRequest} from '@/utils/request';

const {data} = useRequest('/grouped-tasks').json<GroupedTasksRes>();
</script>
