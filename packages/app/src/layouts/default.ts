import {useAppStore} from '@/stores/app';
import {computed, ref, watch} from 'vue';
import {useRequest} from '@/utils/request';
import type {ConfimAction} from 'feedengine';
import {useMessageStore} from '@/stores/message';

export function useGlobalConfirm() {
  const {message} = useAppStore();

  const showSnackbar = ref(false);

  watch(
    () => message,
    (data) => {
      if (data) {
        showSnackbar.value = true;
      }
    }
  );

  async function handleActions(action: ConfimAction) {
    if (action.type === 'api') {
      await useRequest(action.payload);
      showSnackbar.value = false;
    }
  }

  const {consumeMesssage} = useMessageStore();

  return {
    message,
    showSnackbar,
    consumeMesssage,
    handleActions,
  };
}

export function useGlobalNotification() {
  const {notificationSet} = useMessageStore();

  return {
    showNotification: computed(() => notificationSet.size > 0),
    notificationSet,
    showMenu: ref(false),
    clearAllNotification() {
      notificationSet.clear();
    },
  };
}
