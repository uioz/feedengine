<template>
  <VCard>
    <VToolbar>
      <VToolbarTitle class="text-uppercase text-subtitle-2">{{ pluginName }}</VToolbarTitle>
    </VToolbar>
    <VList density="compact">
      <VListItem v-for="item of tasks" :key="item.taskName">
        <VListItemTitle>
          {{ item.taskName
          }}<VChip class="rounded-pill ml-2" size="x-small">{{
            item.setup ? '可创建' : '不可创建'
          }}</VChip>
        </VListItemTitle>
        <div v-if="item.description" :class="$style.subtitle">
          {{ item.description }}
        </div>
        <template #append v-if="item.link">
          <VBtn
            v-if="item.link?.startsWith('/') === false"
            icon="settings"
            :to="`${pluginName}/${item.link}`"
            variant="plain"
          ></VBtn>
          <VBtn v-else icon="settings" :href="item.link" variant="plain"></VBtn>
        </template>
      </VListItem>
    </VList>
  </VCard>
</template>

<script setup lang="ts">
defineProps<{
  pluginName: string;
  tasks: Array<{
    taskName: string;
    setup: boolean;
    description?: string;
    link?: string;
  }>;
}>();
</script>

<style module>
.subtitle {
  opacity: var(--v-medium-emphasis-opacity);
  overflow: hidden;
  padding: 0;
  text-overflow: ellipsis;
  font-size: 0.875rem;
  font-weight: 400;
  letter-spacing: 0.0178571429em;
  line-height: 1rem;
  text-transform: none;
}
</style>
