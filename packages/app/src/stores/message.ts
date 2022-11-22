import {defineStore} from 'pinia';
import {markRaw} from 'vue';
import mitt, {type Emitter} from 'mitt';
import type {MessageBase, NotificationMessage} from 'feedengine';

type MessageEventType = {
  notification: NotificationMessage;
};

interface MessageStoreState {
  eventBus: Emitter<MessageEventType>;
  socket: WebSocket | undefined;
  messageBuffer: Map<string, Array<MessageBase>>;
}

const MESSAGE_URL = '/api/message';

export const useMessageStore = defineStore('message', {
  state: (): MessageStoreState => ({
    eventBus: mitt<MessageEventType>(),
    socket: undefined,
    messageBuffer: new Map(),
  }),
  actions: {
    on(...args: Parameters<MessageStoreState['eventBus']['on']>) {
      const [type, handler] = args;

      this.eventBus.on(type, handler);

      const buffer = this.messageBuffer.get(type);

      if (buffer) {
        let item = buffer.shift();

        while (item) {
          this.eventBus.emit(type as any, item);
          item = buffer.shift();
        }
      }
    },
    off(...args: Parameters<MessageStoreState['eventBus']['off']>) {
      this.eventBus.off(...args);
    },
    connect() {
      this.socket = markRaw(new WebSocket(`ws://${import.meta.env.VITE_WS_MESSAGE}${MESSAGE_URL}`));

      this.socket.addEventListener('message', (message) => {
        const data = JSON.parse(message.data) as MessageBase;

        if (data.channel) {
          if (this.eventBus.all.has(data.channel as any)) {
            this.eventBus.emit(data.channel as any, data);
            return;
          }

          const buffer = this.messageBuffer.get(data.channel);

          if (buffer) {
            buffer.push(data);
          } else {
            this.messageBuffer.set(data.channel, [data]);
          }
        }
      });
    },
    destory() {
      this.eventBus.all.clear();
      this.socket?.close();
      this.messageBuffer.clear();
    },
  },
});
