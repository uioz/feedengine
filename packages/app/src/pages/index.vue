<template>
  <VContainer>
    <AlertCenter></AlertCenter>
    <VRow v-for="item of data" :key="item.name">
      <VCol>
        <PluginCard v-bind="item"></PluginCard>
      </VCol>
    </VRow>
  </VContainer>
</template>
<script setup lang="ts">
import type {LivingRes} from 'feedengine';
import {useRequest} from '@/utils/request';
import PluginCard from '@/components/index/PluginCard.vue';
import AlertCenter from '@/components/index/AlertCenter.vue';

const {data} = useRequest('/living').json<Array<LivingRes>>();
</script>
