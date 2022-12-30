<route>
{
  "meta": {
    "layout": "frame"
  },
}
</route>
<template>
  <VContainer>
    <VCard title="初始配置" :elevation="3" color="white">
      <VCardSubtitle>{{ steps + 1 }}/2</VCardSubtitle>
      <VCardText>
        <component
          ref="form"
          :is="activeStep.component"
          :form-data="activeStep.settings"
        ></component>
      </VCardText>
      <VCardActions>
        <VBtn @click="steps--" v-if="steps <= 1 && steps > 0">上一步</VBtn>
        <VBtn @click="handleNextStep" v-if="steps < 1">下一步</VBtn>
        <VBtn @click="handleFinish" v-if="steps === 1">完成(重启)</VBtn>
      </VCardActions>
    </VCard>
  </VContainer>
</template>
<script setup lang="ts">
import ServerForm from '@/components/settings/ServerForm.vue';
import DriverForm from '@/components/settings/DriverForm.vue';
import {useConfigurationStore} from '@/stores/configuration';
import {onBeforeUnmount, ref, computed} from 'vue';
import {useRequest} from '@/utils/request';
import {useAppStore} from '@/stores/app';

const {settings, $dispose} = useConfigurationStore();

const steps = ref(0);

const activeStep = computed(() => ({
  component: [ServerForm, DriverForm][steps.value],
  settings: [settings!.server, settings!.driver][steps.value],
}));

onBeforeUnmount($dispose);

const form = ref<InstanceType<typeof ServerForm>>();

async function handleNextStep() {
  const {valid} = await form.value!.form!.validate();

  if (valid) {
    steps.value++;
  }
}

async function handleFinish() {
  const {valid} = await form.value!.form!.validate();

  if (valid) {
    const {statusCode} = await useRequest('/settings/feedengine').post(settings);

    if (statusCode.value === 200) {
      useAppStore().restart();
    }
  }
}
</script>
