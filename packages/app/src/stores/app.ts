import {defineStore} from 'pinia';
import type {NotificationMessage, ConfirmMessage} from 'feedengine';
import {useRequest} from '@/utils/request';

interface NormalMessage {
  type: 'warning' | 'info' | 'error' | 'success';
  message: string;
}

export type Message = NotificationMessage | ConfirmMessage | NormalMessage;

export enum AppStatus {
  running,
  restarting,
  closing,
}

interface AppStoreState {
  messages: Array<Message>;
  status: AppStatus;
}

export const useAppStore = defineStore('app', {
  state: (): AppStoreState => ({
    messages: [],
    status: AppStatus.running,
  }),
  actions: {
    globalMessage(message: Message) {
      this.messages.push(message);
    },
    removeMessage(message: Message) {
      this.messages.splice(
        this.messages.findIndex((item) => item === message),
        1
      );
    },
    async restart() {
      const {statusCode} = await useRequest('/restart');

      if (statusCode.value === 200) {
        this.status = AppStatus.restarting;
      }
    },
  },
});
