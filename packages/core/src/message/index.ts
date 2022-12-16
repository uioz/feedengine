import {Closeable} from '../types/index.js';
import {TopDeps} from '../index.js';
import {
  ConfirmMessage,
  NotificationMessage,
  ConfimAction,
  MessageBase,
  MessageConsumable,
  ProgressMessage,
  ProgressHandler,
} from '../types/message.js';

export enum NotificationType {
  'warning' = 'warning',
  'error' = 'error',
  'info' = 'info',
}

function isConsumable(data: any): data is MessageConsumable {
  if (data.consumable) {
    return true;
  }
  return false;
}

export class MessageManager implements Closeable {
  log: TopDeps['log'];
  consumer = new Map<(message: MessageBase) => Promise<void>, () => void>();
  consumableMessagesBuffer: Array<MessageConsumable> = [];
  normalMessagesBuffer: Array<MessageBase> = [];
  pushRefs = new Set<(message: MessageBase) => Promise<void>>();
  progressRefs = new Set<ProgressHandler<never>>();
  id = 0;

  constructor({log}: TopDeps) {
    this.log = log.child({source: MessageManager.name});
  }

  registerConsumer(send: (message: MessageBase) => Promise<void>) {
    const createJob = () => {
      const buffer: Array<MessageBase> = [...this.consumableMessagesBuffer];

      let isRunning = false;

      let isClose = false;

      const run = async () => {
        if (isRunning) {
          return;
        }

        isRunning = true;

        let item = buffer.shift() ?? this.normalMessagesBuffer.shift();

        while (item && !isClose) {
          if (isConsumable(item) && item.consumed) {
            item = buffer.shift() ?? this.normalMessagesBuffer.shift();
            continue;
          }

          try {
            await send(item);
          } catch (error) {
            this.unRegiserConsumer(send);
            throw error;
          }

          item = buffer.shift() ?? this.normalMessagesBuffer.shift();
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
      this.consumableMessagesBuffer.push(message);
    }

    if (this.pushRefs.size === 0) {
      if (message.channel === 'notification') {
        this.normalMessagesBuffer.push(message);
      }
    } else {
      for (const push of this.pushRefs) {
        push(message);
      }
    }
  }

  consume(id: string) {
    const pos = this.consumableMessagesBuffer.findIndex((item) => item.id === id);

    if (pos !== -1) {
      this.consumableMessagesBuffer[pos].consumed = true;
      this.consumableMessagesBuffer.splice(pos, 1);
    }
  }

  notification(source: string) {
    const handler = (type: NotificationType) => (message: string) => {
      this.push({
        channel: 'notification',
        source,
        type,
        message,
      } as NotificationMessage);
    };

    return {
      warning: handler(NotificationType.warning),
      error: handler(NotificationType.error),
      info: handler(NotificationType.info),
    };
  }

  confirm(source: string) {
    const handler =
      (type: NotificationType) =>
      (message: string, actions: Array<ConfimAction> = []) => {
        this.push({
          channel: 'confirm',
          consumable: true,
          consumed: false,
          id: `${this.id++}`,
          source,
          type,
          message,
          actions,
        } as ConfirmMessage);
      };

    return {
      warning: handler(NotificationType.warning),
      error: handler(NotificationType.error),
      info: handler(NotificationType.info),
    };
  }

  progress<T extends ProgressMessage>(
    channel: T['channel'],
    source: string | number
  ): ProgressHandler<T> {
    let open = true;

    const handler: ProgressHandler<T> = {
      send: (data) => {
        if (open) {
          this.push({
            channel,
            source,
            ...data,
          });
        }

        return handler;
      },
      end: () => {
        open = false;
        this.progressRefs.delete(handler);
      },
    };

    this.progressRefs.add(handler);

    return handler;
  }

  async close() {
    for (const cb of this.consumer.keys()) {
      this.unRegiserConsumer(cb);
    }

    for (const progress of this.progressRefs) {
      progress.end();
    }

    this.log.info(`close`);
  }
}
