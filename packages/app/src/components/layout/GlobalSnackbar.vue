<template>
  <VSnackbar v-model="showSnackbar" vertical :color="message?.type" :timeout="4000">
    {{ message?.message }}
    <template v-slot:actions>
      <template v-if="isConfirmMessage(message)">
        <VBtn
          v-for="item of message.actions"
          :key="item.payload"
          :href="item.type === 'link' ? item.payload : undefined"
          :target="item.type === 'link' ? '_blank' : undefined"
          @click="handleActions(item)"
          >{{ item.label }}</VBtn
        >
      </template>
      <VBtn @click="consumeMesssage" color="white">确认</VBtn>
    </template>
  </VSnackbar>
</template>
<script setup lang="ts">
import {Message} from '@/stores/app';
import {isConfirmMessage} from '@/utils/message';
import {useSnackbar} from './GlobalSnackbar';

const props = defineProps<{
  message: Message;
}>();

const {handleActions, consumeMesssage, showSnackbar} = useSnackbar(props.message);
</script>
