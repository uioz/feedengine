<template>
  <section :class="section" class="mt-4">
    <h4 class="text-h4">服务器</h4>
    <VForm class="mt-4" :readonly="submitting">
      <VTextField
        v-model="formData.host"
        label="主机地址"
        placeholder="例如: 127.0.0.1"
        clearable
      ></VTextField>
      <VTextField
        v-model="formData.port"
        label="端口号"
        placeholder="例如: 8080"
        clearable
      ></VTextField>
      <VBtn @click="handleSubmit" :loading="submitting" :disabled="!changed">修改</VBtn>
      <VBtn class="ml-2" v-show="changed && !submitting" @click="handleCancel" variant="text"
        >取消</VBtn
      >
    </VForm>
  </section>
</template>
<script setup lang="ts">
import {section} from './style.module.css';
import type {AppSettings} from 'feedengine';
import {ref, nextTick} from 'vue';
import {clone} from '@/utils/helper';
import {useRequest} from '@/utils/request';
import {syncRef, useVModel, watchPausable} from '@vueuse/core';
import {useAppStore} from '@/stores/app';

const props = defineProps<{
  modelValue: AppSettings['server'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', data: AppSettings['server']): void;
}>();

const settings = useVModel(props, 'modelValue', emits);

const formData = ref(clone(settings.value));

const changed = ref(false);

const {pause, resume} = watchPausable(formData, () => (changed.value = true), {
  deep: true,
});

function handleCancel() {
  pause();
  formData.value = clone(settings.value);
  changed.value = false;
  nextTick(resume);
}

const submitting = ref(false);

function handleSubmit() {
  const {statusCode, onFetchFinally, isFetching} = useRequest('/settings/feedengine/server').patch(
    formData
  );

  syncRef(submitting, isFetching);

  onFetchFinally(() => {
    if (statusCode.value === 200) {
      settings.value = formData.value;
      changed.value = false;
      useAppStore().globalMessage({
        type: 'success',
        message: '修改成功',
      });
    } else {
      useAppStore().globalMessage({
        type: 'success',
        message: '修改失败',
      });
    }
  });
}
</script>
