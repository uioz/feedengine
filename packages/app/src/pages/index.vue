<template>
  <VContainer>
    <VRow v-for="item of data" :key="item.name">
      <VCol>
        <PluginCard v-bind="item"></PluginCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
<script setup lang="ts">
import type {PluginStateApi} from 'feedengine';
import {useRequest} from '@/utils/request';
import PluginCard from '@/components/index/PluginCard.vue';

const {data} = useRequest('/plugins/state').json<Array<PluginStateApi>>();
</script>
