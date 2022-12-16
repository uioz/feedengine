import {defineStore} from 'pinia';
import type {NotificationMessage, ConfirmMessage} from 'feedengine';

interface AppStoreState {
  message: NotificationMessage | ConfirmMessage | null;
}

export const useAppStore = defineStore('app', {
  state: (): AppStoreState => ({
    message: null,
  }),
  actions: {
    globalMessage(message: NotificationMessage | ConfirmMessage) {
      this.message = message;
    },
  },
});
