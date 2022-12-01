<template>
  <VContainer>
    <VRow v-for="item of data" :key="item.pluginName">
      <VCol>
        <TaskCard v-bind="item"></TaskCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
<script setup lang="ts">
import type {TasksApi} from 'feedengine';
import TaskCard from '@/components/task/TaskCard.vue';

import {useRequest} from '@/utils/request';

const {data} = useRequest('/tasks').json<TasksApi>();
</script>
