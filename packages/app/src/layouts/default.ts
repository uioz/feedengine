import {computed, ref} from 'vue';
import {useMessageStore} from '@/stores/message';

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
