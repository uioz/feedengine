<template>
  <VApp>
    <VAppBar density="compact">
      <VAppBarTitle class="text-overline">feedengine</VAppBarTitle>
      <template #append>
        <VMenu v-model="showMenu" :close-on-content-click="false">
          <template #activator="{props}">
            <VBtn v-bind="props" icon v-show="showNotification">
              <VBadge color="error" dot><VIcon icon="notifications"></VIcon></VBadge>
            </VBtn>
          </template>
          <VSheet min-width="400">
            <VContainer>
              <VRow dense
                ><VCol
                  ><VBtn
                    icon="clear_all"
                    variant="text"
                    @click="clearAllNotification"
                  ></VBtn> </VCol
              ></VRow>
              <VRow dense v-for="item of notificationSet" :key="item.source">
                <VCol>
                  <VAlert :color="item.type" variant="tonal">
                    <VAlertTitle>
                      <div>{{ item.source }}</div>
                      <VBtn
                        class="ml-auto"
                        :color="item.type"
                        variant="text"
                        size="small"
                        icon="delete"
                        @click="consumeMesssage(item)"
                      ></VBtn>
                    </VAlertTitle>
                    {{ item.message }}
                  </VAlert>
                </VCol>
              </VRow>
            </VContainer>
          </VSheet>
        </VMenu>
      </template>
    </VAppBar>
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
    <VSnackbar v-model="showSnackbar" vertical :color="message?.type" :timeout="4000">
      {{ message?.message }}
      <template v-slot:actions>
        <template v-if="isConfirmMessage(message)">
          <VBtn
            v-for="item of message.actions"
            :key="item.payload"
            :href="item.type === 'link' ? item.payload : undefined"
            :target="item.type === 'link' ? '_blank' : undefined"
            @click="handleActions(item), consumeMesssage(message!)"
            >{{ item.label }}</VBtn
          >
        </template>
        <VBtn @click="(showSnackbar = false), consumeMesssage(message!)">确认</VBtn>
      </template>
    </VSnackbar>
  </VApp>
</template>
<script setup lang="ts">
import {isConfirmMessage} from '@/utils/message';
import {useGlobalConfirm, useGlobalNotification} from './default';

const links = [
  {text: '首页', icon: 'home', to: '/'},
  {text: '插件', icon: 'extension', to: '/plugin'},
  {text: '任务', icon: 'task', to: '/task'},
  {text: '计划', icon: 'alarm', to: '/schedule'},
  {text: '设置', icon: 'settings', to: '/settings'},
];

const {consumeMesssage, handleActions, showSnackbar, message} = useGlobalConfirm();

const {notificationSet, showMenu, clearAllNotification, showNotification} = useGlobalNotification();
</script>
