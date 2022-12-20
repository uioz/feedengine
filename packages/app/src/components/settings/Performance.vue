<template>
  <section :class="section" class="mt-4">
    <h4 class="text-h4">性能配置</h4>
    <VAlert title="说明" icon="info" class="mt-2">
      <p>
        <em>最大页面数</em>不限制那些计划任务外的调用, 例如插件通过
        <em>feedengine-atom-plugin</em>提供的<em>RSS/ATOM</em>服务触发的浏览器调用,
        以及启动过程中插件打开浏览器的调用<em>任务并发数</em>和<em>IO并发数</em>同样如此
      </p>
      <p>
        此外IO并发数限制的是那些使用了<em>feedengine</em>内置 IO 队列功能的插件所提供的任务,
        未使用该功能的任务则不受到限制
      </p>
    </VAlert>
    <VForm class="mt-4">
      <VRow>
        <VCol>
          <VTextField label="最大页面数"></VTextField>
        </VCol>
        <VCol>
          <VTextField label="任务并发数"></VTextField>
        </VCol>
        <VCol>
          <VTextField label="IO并发数"></VTextField>
        </VCol>
      </VRow>
      <VBtn>保存</VBtn>
      <VBtn>取消</VBtn>
    </VForm>
  </section>
</template>
<script setup lang="ts">
import {section} from './style.module.css';
</script>
