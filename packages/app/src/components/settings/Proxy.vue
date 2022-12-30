<template>
  <section :class="section" class="mt-4">
    <h4 class="text-h4">代理</h4>
    <VAlert title="说明" icon="info" class="mt-2">
      <p>
        代理配置只会作用于<em>feedengine</em>本身以及实现了代理功能的插件, 不会应用到浏览器上,
        浏览器需要单独配置代理
      </p>
      <p>
        虽然代理可以使用<em>http/s socks4/5</em>等多种协议, 但是并非所有插件都成正确实现,
        为了兼容性考虑建议使用<em>http</em>协议
      </p>
    </VAlert>
    <ProxyForm class="mt-4" v-model:form-data="formData" :readonly="submitting"></ProxyForm>
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
import ProxyForm from './ProxyForm.vue';

const props = defineProps<{
  modelValue: AppSettings['proxy'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', data: AppSettings['proxy']): void;
}>();

const settings = useVModel(props, 'modelValue', emits);

const {handleCancel, handleSubmit, formData, submitting, changed} = useFormdata('proxy', settings);
</script>
