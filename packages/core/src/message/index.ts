import {Closeable} from '../types/index.js';
import {TopDeps} from '../index.js';
import {MessageBase, MessageConsumable} from '../types/message.js';
import {
  NotificationType,
  NotificationActionMessage,
  NotificationMessage,
  NotificationAction,
} from '../types/message.js';

function isConsumable(data: any): data is MessageConsumable {
  if (data.consumable) {
    return true;
  }
  return false;
}

export class MessageManager implements Closeable {
  debug: TopDeps['debug'];
  consumer = new Map<(message: MessageBase) => Promise<void>, () => void>();
  notConsumed: Array<MessageConsumable> = [];
  pushRefs = new Set<(message: MessageBase) => Promise<void>>();
  id = 0;

  constructor({debug}: TopDeps) {
    this.debug = debug;
  }

  registerConsumer(send: (message: MessageBase) => Promise<void>) {
    const createJob = () => {
      const buffer: Array<MessageBase> = [...this.notConsumed];

      let isRunning = false;

      let isClose = false;

      const run = async () => {
        if (isRunning) {
          return;
        }

        isRunning = true;

        let item = buffer.shift();

        while (item && !isClose) {
          if (isConsumable(item) && item.consumed) {
            item = buffer.shift();
            continue;
          }

          try {
            await send(item);
          } catch (error) {
            this.unRegiserConsumer(send);
            throw error;
          }

          item = buffer.shift();
        }

        isRunning = false;
      };

      async function push(message: MessageBase) {
        if (isClose) {
          return;
        }

        buffer.push(message);

        await run();
      }

      function close() {
        isClose = true;
      }

      return {
        buffer,
        send,
        isRunning,
        push,
        close,
        run,
      };
    };

    const {push, close, run} = createJob();

    this.pushRefs.add(push);

    this.consumer.set(send, close);

    run();
  }

  unRegiserConsumer(cb: (message: MessageBase) => Promise<void>) {
    this.consumer.get(cb)?.();
    this.consumer.delete(cb);
    this.pushRefs.delete(cb);
  }

  push<T extends MessageBase>(message: T) {
    if (isConsumable(message)) {
      this.notConsumed.push(message);
    }

    for (const push of this.pushRefs) {
      push(message);
    }
  }

  consume(id: string) {
    const pos = this.notConsumed.findIndex((item) => item.id === id);

    if (pos !== -1) {
      this.notConsumed[pos].consumed = true;
      this.notConsumed.splice(pos, 1);
    }
  }

  notification(source: string) {
    const handler = (type: NotificationType) => (message: string) => {
      this.push({
        channel: 'notification',
        source,
        payload: {
          type,
          message,
        },
      } as NotificationMessage);
    };

    return {
      warn: handler(NotificationType.warn),
      error: handler(NotificationType.error),
      info: handler(NotificationType.info),
    };
  }

  confirm(source: string) {
    const handler =
      (type: NotificationType) => (message: string, actions: Array<NotificationAction>) => {
        this.push({
          channel: 'notification',
          consumable: true,
          consumed: false,
          id: `${this.id++}`,
          source,
          payload: {
            type,
            message,
            actions,
          },
        } as NotificationActionMessage);
      };

    return {
      warn: handler(NotificationType.warn),
      error: handler(NotificationType.error),
      info: handler(NotificationType.info),
    };
  }

  async close() {
    for (const cb of this.consumer.keys()) {
      this.unRegiserConsumer(cb);
    }

    this.debug(`${MessageManager.name} close`);
  }
}
