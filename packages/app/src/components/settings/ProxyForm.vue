<template>
  <VForm v-bind="$attrs" ref="form">
    <VTextField
      v-model="formData.proxyUrl"
      label="代理地址"
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
  formData: AppSettings['proxy'];
}>();

const emits = defineEmits<{
  (e: 'formData', value: AppSettings['proxy']): void;
}>();

const formData = useVModel(props, 'formData', emits);

const form = ref<VForm>();

defineExpose({
  form,
});
</script>
