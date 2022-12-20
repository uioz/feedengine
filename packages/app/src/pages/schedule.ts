import {computed, ref, watch} from 'vue';
import {ScheduleType} from '@/stores/schedule';
import {useRequest} from '@/utils/request';
import type {TasksRes} from 'feedengine';
import {useScheduleStore} from '@/stores/schedule';
import {useAppStore} from '@/stores/app';

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

  const ScheduleStore = useScheduleStore();

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
        const {statusCode} = await useRequest('/schedule').put({
          taskId: taskId ?? activedTaskId.value,
          type: activedScheduleType.value,
          trigger: intervalInput.value ? `d${intervalInput.value}` : undefined,
        });

        if (statusCode.value === 200) {
          useAppStore().globalMessage({
            type: 'success',
            message: '提交成功',
          });

          if (intervalInput.value) {
            exitIntervalForm();
          }

          ScheduleStore.fetch();
        } else {
          useAppStore().globalMessage({
            type: 'error',
            message: '提交失败',
          });
        }
      } finally {
        loading.value = false;
      }
    },
  };
}
