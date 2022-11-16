import {Closeable} from '../types/index.js';
import {TopDeps} from '../index.js';
import {MessageConsumable} from '../types/message.js';

export type MessageInternal<T extends MessageConsumable = any> = T['consumable'] extends true
  ? {consumable: true; id: string; consumed: boolean}
  : {consumable: false};

export class MessageManager implements Closeable {
  debug: TopDeps['debug'];
  consumer = new Map<(message: MessageInternal) => Promise<void>, () => void>();
  notConsumed: Array<MessageInternal<{consumable: true; channel: string}>> = [];
  pushRefs = new Set<(message: MessageInternal) => Promise<void>>();

  constructor({debug}: TopDeps) {
    this.debug = debug;
  }

  registerConsumer(send: (message: MessageInternal) => Promise<void>) {
    const createJob = () => {
      const buffer: Array<MessageInternal> = [...this.notConsumed];

      let isRunning = false;

      let isClose = false;

      const run = async () => {
        if (isRunning) {
          return;
        }

        isRunning = true;

        let item = buffer.shift();

        while (item && !isClose) {
          if (item.consumable && item.consumed) {
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

      async function push(message: MessageInternal) {
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

  unRegiserConsumer(cb: (message: MessageInternal) => Promise<void>) {
    this.consumer.get(cb)?.();
    this.consumer.delete(cb);
    this.pushRefs.delete(cb);
  }

  push(message: MessageInternal) {
    if (message.consumable) {
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

  async close() {
    for (const cb of this.consumer.keys()) {
      this.unRegiserConsumer(cb);
    }

    this.debug(`${MessageManager.name} close`);
  }
}
