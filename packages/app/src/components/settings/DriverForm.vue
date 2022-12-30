<template>
  <VForm v-bind="$attrs" ref="form">
    <VTextField
      v-model="formData.executablePath"
      label="可执行文件路径"
      placeholder="例如: C:\Program Files (x86)\Google\Chrome Dev\Application\chrome.exe"
      :rules="[formRuleValidateHelper(Yup.string().required())]"
    ></VTextField>
    <VTextField
      v-model="formData.userDataDir"
      label="个人资料路径"
      placeholder="例如: C:\Users\xxx\AppData\Local\Google\Chrome Dev\User Data"
      :rules="[formRuleValidateHelper(Yup.string().required())]"
    ></VTextField>
    <VSwitch v-model="formData.headless" label="无头模式" color="primary"></VSwitch>
  </VForm>
</template>
<script setup lang="ts">
import type {AppSettings} from 'feedengine';
import {ref} from 'vue';
import {VForm} from 'vuetify/components';
import {useVModel} from '@vueuse/core';
import * as Yup from 'yup';
import {formRuleValidateHelper} from './common';

const props = defineProps<{
  formData: AppSettings['driver'];
}>();

const emits = defineEmits<{
  (e: 'formData', value: AppSettings['driver']): void;
}>();

const formData = useVModel(props, 'formData', emits);

const form = ref<VForm>();

defineExpose({
  form,
});
</script>
