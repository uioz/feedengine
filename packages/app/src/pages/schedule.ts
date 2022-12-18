import {computed, ref, watch} from 'vue';
import {ScheduleType} from '@/stores/schedule';
import {useRequest} from '@/utils/request';
import type {TasksRes} from 'feedengine';

export function useDialog() {
  const showDialog = ref(false);

  const activedScheduleType = ref(ScheduleType.core);

  const tasks = ref<TasksRes>([]);

  const loading = ref(false);

  const showIntervalForm = ref(false);

  const intervalInput = ref('');

  const activedTaskId = ref<number | null>(null);

  const exitIntervalForm = () => {
    showIntervalForm.value = false;
    intervalInput.value = '';
    activedTaskId.value = null;
  };

  watch(showDialog, (showDialog) => {
    if (!showDialog) {
      exitIntervalForm();
    }
  });

  return {
    loading,
    showDialog,
    activedScheduleType,
    showIntervalForm,
    tasks,
    intervalInput,
    activedTaskId,
    async openDialog(type: ScheduleType) {
      activedScheduleType.value = type;
      showDialog.value = true;

      intervalInput.value = '';

      const {statusCode, data} = await useRequest('/tasks').json<TasksRes>();

      if (statusCode.value === 200 && data.value) {
        tasks.value = data.value;
      }
    },
    exitIntervalForm,
    intervalInputHint: computed(() => `每 ${intervalInput.value} 天执行一次`),
    intervalTextInputRules: [
      (input: string) => (input.length === 0 ? '请输入间隔执行时间' : true),
      (input: string) => (parseInt(input) > 0 ? true : '间隔时间最小为一天'),
    ],
    openIntervalForm(taskId: number) {
      showIntervalForm.value = true;
      activedTaskId.value = taskId;
    },
    async submit(taskId?: number) {
      if (loading.value) {
        return;
      }

      loading.value = true;

      try {
        await useRequest('/schedule').put({
          taskId: taskId ?? activedTaskId.value,
          type: activedScheduleType.value,
          trigger: intervalInput.value ? `d${intervalInput.value}` : undefined,
        });

        if (intervalInput.value) {
          exitIntervalForm();
        }
      } finally {
        loading.value = false;
      }
    },
  };
}
