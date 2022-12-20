import {ref, watch} from 'vue';
import {Message, useAppStore} from '@/stores/app';
import {useRequest} from '@/utils/request';
import type {ConfimAction} from 'feedengine';
import {useMessageStore} from '@/stores/message';
import {isConfirmMessage, isNotificationMessage} from '@/utils/message';

export function useSnackbar(message: Message) {
  async function handleActions(action: ConfimAction) {
    if (action.type === 'api') {
      await useRequest(action.payload);
    }
  }

  const showSnackbar = ref(true);

  const {removeMessage} = useAppStore();

  function consumeMesssage() {
    removeMessage(message);
    if (isConfirmMessage(message) || isNotificationMessage(message)) {
      useMessageStore().consumeMesssage(message);
    }
  }

  watch(showSnackbar, (showSnackbar) => {
    if (!showSnackbar) {
      consumeMesssage();
    }
  });

  return {
    showSnackbar,
    consumeMesssage,
    handleActions,
  };
}
