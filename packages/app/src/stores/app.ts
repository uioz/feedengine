import {defineStore} from 'pinia';
import type {NotificationMessage, ConfirmMessage} from 'feedengine';

interface NormalMessage {
  type: 'warning' | 'info' | 'error' | 'success';
  message: string;
}

export type Message = NotificationMessage | ConfirmMessage | NormalMessage;

interface AppStoreState {
  messages: Array<Message>;
}

export const useAppStore = defineStore('app', {
  state: (): AppStoreState => ({
    messages: [],
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
  },
});
