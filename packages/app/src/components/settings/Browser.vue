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
      <VTextField label="可执行文件路径" placeholder="例如: "></VTextField>
      <VTextField label="个人资料路径"></VTextField>
      <VSwitch label="无头模式"></VSwitch>
      <VBtn>保存</VBtn>
      <VBtn>取消</VBtn>
    </VForm>
  </section>
</template>
<script setup lang="ts">
import {section} from './style.module.css';
</script>
