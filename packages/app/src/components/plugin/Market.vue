<template>
  <VContainer>
    <VTextField
      v-model="serachText"
      variant="solo"
      placeholder="查询你想要的插件"
      density="compact"
      prepend-inner-icon="search"
      :loading="loading"
    ></VTextField>
    <VRow>
      <VCol v-for="item of data" cols="12" :key="item.package.name">
        <VCard :title="item.package.name">
          <VCardSubtitle>
            <span>版本: {{ item.package.version }}</span>
            <span class="ml-4">
              最后更新时间:
              {{ new Date(item.package.date).toLocaleString() }}
            </span>
          </VCardSubtitle>
          <template #append>
            <v-menu>
              <template v-slot:activator="{props}">
                <VBtn v-bind="props" icon="more_vert" variant="text"></VBtn>
              </template>
              <v-list>
                <v-list-item
                  v-if="item.package.links.homepage"
                  title="主页"
                  :href="item.package.links.homepage"
                  target="_blank"
                >
                </v-list-item>
                <v-list-item
                  v-if="item.package.links.repository"
                  title="仓库"
                  :href="item.package.links.repository"
                  target="_blank"
                >
                </v-list-item>
                <v-list-item
                  v-if="item.package.links.npm"
                  title="npm"
                  :href="item.package.links.npm"
                  target="_blank"
                >
                </v-list-item>
              </v-list>
            </v-menu>
          </template>
          <VChipGroup class="px-4 pt-0" column>
            <VChip v-for="keyword of item.package.keywords" :key="keyword" size="small">{{
              keyword
            }}</VChip>
          </VChipGroup>
          <VCardText>{{ item.package.description }}</VCardText>
          <VCardActions>
            <VBtn prepend-icon="download">安装</VBtn>
          </VCardActions>
        </VCard>
      </VCol>
    </VRow>
  </VContainer>
  <VPagination size="small" v-model="currentPage" :length="pageCount"></VPagination>
</template>
<script setup lang="ts">
import {usePagination} from './Market';
import {ref} from 'vue';
import {refDebounced} from '@vueuse/core';

const serachText = ref('');

const {currentPage, fetchData, pageCount, data, loading} = usePagination(
  refDebounced(serachText, 500)
);

fetchData();
</script>
