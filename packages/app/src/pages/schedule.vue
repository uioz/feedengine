<template>
  <div>
    <VSheet v-for="item of list" :key="item.type" rounded="lg" class="mb-2">
      <VToolbar rounded="lg" :title="item.label">
        <VBtn
          @click="openDialog(item.type)"
          :variant="(ScheduleStore as any)[ScheduleType[item.type]].length ? 'plain' : 'elevated'"
          icon="add_task"
        >
        </VBtn>
      </VToolbar>
      <component :is="item.component" :type="item.type"></component>
    </VSheet>
    <VDialog v-model="showDialog" scrollable>
      <VCard>
        <VCardTitle> 添加{{ labelMap[activedScheduleType] }}任务 </VCardTitle>
        <VSlideXTransition mode="out-in">
          <VTable v-if="!showIntervalForm">
            <thead>
              <tr>
                <th class="text-left">id</th>
                <th class="text-left">名称</th>
                <th class="text-left">所属</th>
                <th class="text-left">创建日期</th>
                <th class="text-left">操作</th>
              </tr>
            </thead>
            <tbody>
              <tr v-for="task of tasks" :key="task.id">
                <td>{{ task.id }}</td>
                <td>{{ task.name }}</td>
                <td>{{ `${task.plugin}@${task.task}` }}</td>
                <td>{{ task.createdAt }}</td>
                <td>
                  <VBtn
                    size="small"
                    rounded="lg"
                    variant="text"
                    icon="library_add"
                    @click="
                      activedScheduleType === ScheduleType.interval
                        ? openIntervalForm(task.id)
                        : submit(task.id)
                    "
                  ></VBtn>
                </td>
              </tr>
            </tbody>
          </VTable>
          <VForm v-if="showIntervalForm">
            <VTextField
              v-model.number="intervalInput"
              label="执行间隔天数"
              :hint="intervalInputHint"
              :rules="intervalTextInputRules"
              placeholder="单位: 天"
            ></VTextField>
          </VForm>
        </VSlideXTransition>
        <VCardActions>
          <template v-if="showIntervalForm">
            <VBtn class="ml-auto" color="secondary" @click="exitIntervalForm">取消</VBtn>
            <VBtn color="primary" @click="submit()">确认</VBtn>
          </template>
          <VBtn v-else class="ml-auto" color="primary" @click="showDialog = false">关闭</VBtn>
        </VCardActions>
      </VCard>
    </VDialog>
  </div>
</template>
<script setup lang="ts">
import {useScheduleStore, ScheduleType} from '@/stores/schedule';
import ManualTable from '@/components/schedule/ManualTable.vue';
import IntervalTable from '@/components/schedule/IntervalTable.vue';
import StartupTable from '@/components/schedule/StartupTable.vue';
import {useDialog} from './schedule';

const ScheduleStore = useScheduleStore();

ScheduleStore.fetch();

const labelMap = {
  [ScheduleType.manual]: '手动执行',
  [ScheduleType.interval]: '定时执行',
  [ScheduleType.startup]: '启动时执行',
  [ScheduleType.core]: '内部任务',
} as const;

const list = [
  {
    type: ScheduleType.manual,
    component: ManualTable,
    label: labelMap[ScheduleType.manual],
  },
  {
    type: ScheduleType.interval,
    component: IntervalTable,
    label: labelMap[ScheduleType.interval],
  },
  {
    type: ScheduleType.startup,
    component: StartupTable,
    label: labelMap[ScheduleType.startup],
  },
] as const;

const {
  tasks,
  openDialog,
  showDialog,
  activedScheduleType,
  submit,
  showIntervalForm,
  intervalInputHint,
  intervalInput,
  exitIntervalForm,
  intervalTextInputRules,
  openIntervalForm,
} = useDialog();
</script>
