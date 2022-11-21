<template>
  <VContainer>
    <PluginCard v-for="item of data" :key="item.name" v-bind="item"></PluginCard>
  </VContainer>
</template>
<script setup lang="ts">
import {PluginsState} from '~/index';
import {useRequest} from '@/utils/request';
import PluginCard from '@/components/index/PluginCard.vue';

const {data} = useRequest('/plugins/state').json<PluginsState>();
</script>
