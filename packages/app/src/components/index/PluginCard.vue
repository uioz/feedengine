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
    <VExpansionPanels variant="accordion">
      <VExpansionPanel>
        <VExpansionPanelTitle>
          <VChip color="primary"
            ><VIcon start icon="app_registration"></VIcon>{{ taskCount }}</VChip
          >
          <VChip class="ml-2" color="pink"
            ><VIcon start icon="send"></VIcon>{{ taskInRunningCount }}</VChip
          >
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          Lorem ipsum dolor, sit amet consectetur adipisicing elit. Voluptates eius reiciendis eaque
          explicabo maxime quasi aspernatur alias nemo, aperiam voluptatibus, ad at, placeat harum
          obcaecati. Eaque harum vitae quam molestias.
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>
    <v-progress-linear
      :active="state !== 'actived'"
      color="success"
      indeterminate
    ></v-progress-linear>
  </VCard>
</template>

<script setup lang="ts">
import type {LivingRes} from 'feedengine';
import {computed} from 'vue';

const props = defineProps<{
  name: LivingRes['name'];
  version: LivingRes['version'];
  state: LivingRes['state'];
  task: LivingRes['task'];
  app?: LivingRes['app'];
}>();

const taskCount = computed(() => props.task.length);

const taskInRunningCount = computed(() =>
  props.task.map((item) => item.running.length).reduce((prev, next) => prev + next, 0)
);
</script>
