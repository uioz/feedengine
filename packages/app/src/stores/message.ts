import {defineStore} from 'pinia';
import {markRaw} from 'vue';
import mitt, {type Emitter} from 'mitt';
import type {NotificationMessage, ConfirmMessage} from 'feedengine';
import {useAppStore} from './app';
import {isConfirmMessage} from '../utils/message';

type MessageEventType = {
  notification: NotificationMessage;
  confirm: ConfirmMessage;
  [key: string]: any;
};

interface MessageStoreState {
  eventBus: Emitter<MessageEventType>;
  socket: WebSocket | undefined;
  confirmSet: Set<ConfirmMessage>;
  notificationSet: Set<NotificationMessage>;
}

const MESSAGE_URL = '/api/message';

function isMessage(data: any) {
  if (typeof data?.channel === 'string') {
    return true;
  }

  return false;
}

export const useMessageStore = defineStore('message', {
  state: (): MessageStoreState => ({
    eventBus: mitt<MessageEventType>(),
    socket: undefined,
    confirmSet: new Set(),
    notificationSet: new Set(),
  }),
  actions: {
    connect() {
      this.socket = markRaw(new WebSocket(`ws://${import.meta.env.VITE_WS_MESSAGE}${MESSAGE_URL}`));

      this.socket.addEventListener('message', (message) => {
        const data = JSON.parse(message.data);

        if (!isMessage(data)) {
          return;
        }

        switch (data.channel) {
          case 'TaskProgress':
            this.eventBus.emit(`TaskProgress@${data.source}`, data);
            break;
          case 'PluginProgress':
            this.eventBus.emit(`PluginProgress@${data.source}`, data);
            break;
          case 'notification':
            this.eventBus.emit('notification', data);
            this.notificationSet.add(data);
            useAppStore().globalMessage(data);
            break;
          case 'confirm':
            this.eventBus.emit('confirm', data);
            this.confirmSet.add(data);
            useAppStore().globalMessage(data);
            break;
        }
      });
    },
    consumeMesssage(message: ConfirmMessage | NotificationMessage) {
      if (isConfirmMessage(message)) {
        this.socket?.send(JSON.stringify(message));
        this.confirmSet.delete(message);
      } else {
        this.notificationSet.delete(message);
      }
    },
    destory() {
      this.eventBus.all.clear();
      this.socket?.close();
      this.confirmSet.clear();
      this.notificationSet.clear();
    },
  },
});
