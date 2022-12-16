<template>
  <VRow v-for="item of confirmSet" :key="item.id">
    <VCol>
      <VAlert rounded="lg" :title="item.source" variant="tonal" :color="item.type">
        {{ item.message }}
        <VDivider></VDivider>
        <div class="d-flex flex-row justify-end">
          <VBtn
            class="mt-2 ml-2"
            v-for="action of item.actions"
            :key="action.payload"
            :href="action.type === 'link' ? action.payload : undefined"
            :target="action.type === 'link' ? '_blank' : undefined"
            :color="item.type"
            variant="tonal"
            rounded="lg"
            @click="handleActions(action, item)"
            >{{ action.label }}</VBtn
          >
          <v-btn
            class="ml-2 mt-2"
            :color="item.type"
            variant="tonal"
            rounded="lg"
            @click="consumeMesssage(item)"
            >确认</v-btn
          >
        </div>
      </VAlert>
    </VCol>
  </VRow>
</template>
<script setup lang="ts">
import {useMessageStore} from '@/stores/message';
import {ConfimAction, ConfirmMessage} from 'feedengine';
import {useRequest} from '@/utils/request';

const {confirmSet, consumeMesssage} = useMessageStore();

async function handleActions(action: ConfimAction, message: ConfirmMessage) {
  if (action.type === 'api') {
    await useRequest(action.payload);
  }
  consumeMesssage(message);
}
</script>
