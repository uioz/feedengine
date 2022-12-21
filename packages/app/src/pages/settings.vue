<template>
  <div>
    <VAlert title="提示" icon="info" color="warning" variant="tonal">
      <p>设置修改后需要重启<em>feedengine</em>才会生效</p>
    </VAlert>
    <template v-if="data">
      <Server v-model="data.server"></Server>
      <Performance v-model="data.performance"></Performance>
      <Browser v-model="data.driver"></Browser>
      <Proxy v-model="data.proxy"></Proxy>
    </template>
  </div>
</template>
<script setup lang="ts">
import Server from '@/components/settings/Server.vue';
import Performance from '@/components/settings/Performance.vue';
import Browser from '@/components/settings/Browser.vue';
import Proxy from '@/components/settings/Proxy.vue';
import {useRequest} from '@/utils/request';
import type {AppSettings} from 'feedengine';

const {data} = useRequest('/settings/feedengine').json<AppSettings>();
</script>
