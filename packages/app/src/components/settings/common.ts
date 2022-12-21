import type {AppSettings} from 'feedengine';
import {ref, nextTick, type Ref} from 'vue';
import {clone} from '@/utils/helper';
import {useRequest} from '@/utils/request';
import {syncRef, watchPausable} from '@vueuse/core';
import {useAppStore} from '@/stores/app';

export function useFormdata<T extends keyof AppSettings>(type: T, settings: Ref<AppSettings[T]>) {
  const formData = ref(clone(settings.value));

  const changed = ref(false);

  const {pause, resume} = watchPausable(formData, () => (changed.value = true), {
    deep: true,
  });

  function handleCancel() {
    pause();
    formData.value = clone(settings.value);
    changed.value = false;
    nextTick(resume);
  }

  const submitting = ref(false);

  function handleSubmit() {
    const {statusCode, onFetchFinally, isFetching} = useRequest(
      `/settings/feedengine/${type}`
    ).patch(formData);

    syncRef(submitting, isFetching);

    onFetchFinally(() => {
      if (statusCode.value === 200) {
        settings.value = formData.value;
        changed.value = false;
        useAppStore().globalMessage({
          type: 'success',
          message: '修改成功',
        });
      } else {
        useAppStore().globalMessage({
          type: 'success',
          message: '修改失败',
        });
      }
    });
  }

  return {
    formData,
    submitting,
    changed,
    handleSubmit,
    handleCancel,
  };
}
