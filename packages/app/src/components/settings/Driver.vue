<template>
  <section :class="section" class="mt-4">
    <h4 class="text-h4">浏览器</h4>
    <VAlert title="说明" icon="info" class="mt-2">
      <p>浏览器配置可以通过在浏览器地址栏中输入<em>chrome://version</em>获得</p>
    </VAlert>
    <DriverForm class="mt-4" v-model:form-data="formData" :readonly="submitting"></DriverForm>
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
import DriverForm from './DriverForm.vue';

const props = defineProps<{
  modelValue: AppSettings['driver'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', data: AppSettings['driver']): void;
}>();

const settings = useVModel(props, 'modelValue', emits);

const {handleCancel, handleSubmit, formData, submitting, changed} = useFormdata('driver', settings);
</script>
