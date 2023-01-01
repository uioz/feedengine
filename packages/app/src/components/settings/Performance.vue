<template>
  <section :class="section" class="mt-4">
    <h4 class="text-h4">资源限制</h4>
    <VAlert title="说明" icon="info" class="mt-2">
      <p>
        <em>最大页面数</em>不限制那些计划任务外的调用, 例如插件通过
        <em>feedengine-atom-plugin</em>提供的<em>RSS/ATOM</em>服务触发的浏览器调用,
        以及启动过程中插件打开浏览器的调用<em>任务并发数</em>和<em>IO并发数</em>同样如此
      </p>
      <p>
        <em>IO并发数限制</em>限制使用了<em>feedengine</em>内置 IO 队列的插件所提供的任务,
        未使用该功能的任务则不受到限制
      </p>
    </VAlert>
    <VForm class="mt-4">
      <VRow>
        <VCol>
          <VTextField v-model="formData.pagesConcurrency" label="最大页面数" clearable></VTextField>
        </VCol>
        <VCol>
          <VTextField v-model="formData.taskConcurrency" label="任务并发数" clearable></VTextField>
        </VCol>
        <VCol>
          <VTextField v-model="formData.ioConcurrency" label="IO并发数" clearable></VTextField>
        </VCol>
      </VRow>
      <VExpansionPanels class="mb-5">
        <VExpansionPanel title="插件配置">
          <VExpansionPanelText>
            <VRow>
              <VCol v-for="item of formData.plugins" :key="item.name" :cols="6">
                <VCard :title="item.name" rounded="0">
                  <VCardText>
                    <div class="text-caption">任务并发数</div>
                    <VSlider
                      :min="1"
                      :max="10"
                      :step="1"
                      v-model="item.maxTask"
                      thumb-label
                    ></VSlider>
                    <div class="text-caption">IO并发数</div>
                    <VSlider
                      :min="1"
                      :max="20"
                      :step="1"
                      v-model="item.maxIo"
                      thumb-label
                    ></VSlider>
                  </VCardText>
                </VCard>
              </VCol>
            </VRow>
          </VExpansionPanelText>
        </VExpansionPanel>
      </VExpansionPanels>
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
  modelValue: AppSettings['performance'];
}>();

const emits = defineEmits<{
  (e: 'update:modelValue', data: AppSettings['performance']): void;
}>();

const settings = useVModel(props, 'modelValue', emits);

const {handleCancel, handleSubmit, formData, submitting, changed} = useFormdata(
  'performance',
  settings
);
</script>
