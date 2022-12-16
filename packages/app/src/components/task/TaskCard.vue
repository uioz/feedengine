<template>
  <VCard rounded="lg" elevation="0">
    <VToolbar>
      <VToolbarTitle class="text-uppercase text-subtitle-2">{{ pluginName }}</VToolbarTitle>
    </VToolbar>
    <VExpansionPanels variant="accordion" multiple>
      <VExpansionPanel v-for="item of tasks" :key="item.taskName">
        <VExpansionPanelTitle>
          {{ item.taskName }}
          <template v-if="item.link">
            <VBtn
              v-if="item.link?.startsWith('/') === false"
              size="small"
              icon="open_in_new"
              :to="`${pluginName}/${item.link}`"
              variant="plain"
            ></VBtn>
            <VBtn v-else icon="open_in_new" size="small" :href="item.link" variant="plain"></VBtn>
          </template>
        </VExpansionPanelTitle>
        <VExpansionPanelText>
          <VSheet v-if="item.description" :class="$style.subtitle">
            {{ item.description }}
          </VSheet>
          <VTable>
            <thead>
              <tr>
                <th class="text-left">id</th>
                <th class="text-left">名称</th>
                <th class="text-left">创建日期</th>
                <th class="text-left">设置</th>
                <th class="text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="instance in item.instances" :key="instance.id">
                <td>{{ instance.id }}</td>
                <td>{{ instance.name }}</td>
                <td>{{ instance.createdAt }}</td>
                <td>{{ instance.settings }}</td>
                <td>
                  <VBtn size="small" rounded="lg" variant="text" icon="edit"></VBtn>
                  <VBtn size="small" rounded="lg" variant="text" icon="delete"></VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>
        </VExpansionPanelText>
      </VExpansionPanel>
    </VExpansionPanels>
  </VCard>
</template>

<script setup lang="ts">
defineProps<{
  pluginName: string;
  tasks: {
    taskName: string;
    description?: string | undefined;
    link?: string | undefined;
    instances: {
      id: number;
      name: string | null;
      createdAt: Date;
      settings: any;
    }[];
  }[];
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
