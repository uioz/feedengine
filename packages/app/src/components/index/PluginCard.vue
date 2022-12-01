<template>
  <VCard>
    <VToolbar>
      <VToolbarTitle class="text-uppercase text-subtitle-2">{{
        `${name}@${version}`
      }}</VToolbarTitle>
      <VSpacer></VSpacer>
      <template v-if="app">
        <VBtn v-if="app.url || app.settings === undefined" icon="apps" :href="app.url"> </VBtn>
        <VBtn
          v-if="app.settings"
          icon="settings"
          :href="typeof app.settings === 'boolean' && app.settings ? app.url : app.settings"
        >
        </VBtn>
      </template>
    </VToolbar>
    <v-progress-linear
      :active="state !== 'actived'"
      color="success"
      indeterminate
    ></v-progress-linear>
  </VCard>
</template>

<script setup lang="ts">
import type {LivingApi} from 'feedengine';

defineProps<{
  name: LivingApi['name'];
  version: LivingApi['version'];
  state: LivingApi['state'];
  app?: LivingApi['app'];
}>();
</script>
