<template>
  <VCard>
    <VToolbar>
      <VToolbarTitle>{{ `${name}@${version}` }}</VToolbarTitle>
      <VSpacer></VSpacer>
      <template v-if="app">
        <VBtn v-if="app.settings === undefined" icon="apps" :href="app.url"> </VBtn>
        <VBtn
          v-if="app.settings"
          icon="settings"
          :href="typeof app.settings === 'boolean' && app.settings ? app.url : app.settings"
        >
        </VBtn>
      </template>
    </VToolbar>
    <v-progress-linear
      :active="state !== 'onActive'"
      color="success"
      indeterminate
    ></v-progress-linear>
    test
  </VCard>
</template>

<script setup lang="ts">
import {PluginState} from '~/index';

defineProps<{
  name: PluginState['name'];
  version: PluginState['version'];
  state: PluginState['state'];
  app?: PluginState['app'];
}>();
</script>
