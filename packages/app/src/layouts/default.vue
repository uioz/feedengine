<template>
  <VApp>
    <VAppBar title="feedengine" density="compact"> </VAppBar>
    <VMain>
      <VContainer>
        <VRow>
          <VCol cols="2">
            <VCard flat>
              <VList>
                <VListItem
                  v-for="item of links"
                  :key="item.text"
                  rounded="xl"
                  :to="item.to"
                  :prepend-icon="item.icon"
                >
                  <template #title>{{ item.text }}</template>
                </VListItem>
              </VList>
            </VCard>
          </VCol>
          <VCol cols="10">
            <RouterView></RouterView>
          </VCol>
        </VRow>
      </VContainer>
    </VMain>
  </VApp>
</template>
<script setup lang="ts">
const links = [
  {text: '首页', icon: 'home', to: '/'},
  {text: '插件', icon: 'extension', to: '/plugin'},
  {text: '计划', icon: 'alarm', to: '/schedule'},
  {text: '设置', icon: 'settings', to: '/settings'},
];
</script>
