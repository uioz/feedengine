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
import {useVModel} from '@vueuse/core';
import {useFormdata} from './common';

const props = defineProps<{
  modelValue: AppSettings['server'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', data: AppSettings['server']): void;
}>();

const settings = useVModel(props, 'modelValue', emits);

const {handleCancel, handleSubmit, formData, submitting, changed} = useFormdata('server', settings);
</script>
