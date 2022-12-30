<template>
  <section :class="section" class="mt-4">
    <h4 class="text-h4">服务器</h4>
    <ServerForm class="mt-4" :readonly="submitting" v-model:form-data="formData"></ServerForm>
    <VBtn @click="handleSubmit" :loading="submitting" :disabled="!changed">修改</VBtn>
    <VBtn class="ml-2" v-show="changed && !submitting" @click="handleCancel" variant="text"
      >取消</VBtn
    >
  </section>
</template>
<script setup lang="ts">
import {section} from './style.module.css';
import type {AppSettings} from 'feedengine';
import {useVModel} from '@vueuse/core';
import {useFormdata} from './common';
import ServerForm from './ServerForm.vue';

const props = defineProps<{
  modelValue: AppSettings['server'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', data: AppSettings['server']): void;
}>();

const settings = useVModel(props, 'modelValue', emits);

const {handleCancel, handleSubmit, formData, submitting, changed} = useFormdata('server', settings);
</script>
