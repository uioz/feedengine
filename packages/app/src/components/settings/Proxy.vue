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
    <VForm class="mt-4">
      <VTextField label="代理地址"></VTextField>
      <VBtn>保存</VBtn>
      <VBtn>取消</VBtn>
    </VForm>
  </section>
</template>
<script setup lang="ts">
import {section} from './style.module.css';
</script>
