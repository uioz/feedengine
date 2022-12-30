<template>
  <VForm class="mt-4" v-bind="$attrs" ref="form">
    <VTextField
      v-model="formData.host"
      label="主机地址"
      placeholder="例如: 127.0.0.1"
      :rules="[formRuleValidateHelper(Yup.string().required())]"
    ></VTextField>
    <VTextField
      v-model="formData.port"
      label="端口号"
      placeholder="例如: 8080"
      :rules="[formRuleValidateHelper(Yup.string().required())]"
    ></VTextField>
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
  formData: AppSettings['server'];
}>();

const emits = defineEmits<{
  (e: 'formData', value: AppSettings['server']): void;
}>();

const formData = useVModel(props, 'formData', emits);

const form = ref<VForm>();

defineExpose({
  form,
});
</script>
