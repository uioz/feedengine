<template>
  <section :class="section" class="mt-4">
    <h4 class="text-h4">浏览器</h4>
    <VAlert title="说明" icon="info" class="mt-2">
      <p>浏览器配置可以通过在浏览器地址栏中输入<em>chrome://version</em>获得</p>
      <p>
        windows 平台的地址需要对反斜线进行转义, 例如:<code
          >C:\\Program Files\\BraveSoftware\\Brave-Browser\\Application\\brave.exe</code
        >而不是<code>C:\Program Files\BraveSoftware\Brave-Browser\Application\brave.exe</code>
      </p>
    </VAlert>
    <VForm class="mt-4">
      <VTextField
        v-model="formData.executablePath"
        label="可执行文件路径"
        placeholder="例如: "
        clearable
      ></VTextField>
      <VTextField v-model="formData.userDataDir" label="个人资料路径" clearable></VTextField>
      <VSwitch v-model="formData.headless" label="无头模式" color="primary"></VSwitch>
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
  modelValue: AppSettings['driver'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', data: AppSettings['driver']): void;
}>();

const settings = useVModel(props, 'modelValue', emits);

const {handleCancel, handleSubmit, formData, submitting, changed} = useFormdata('driver', settings);
</script>
