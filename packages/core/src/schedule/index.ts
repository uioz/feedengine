import type {TopDeps} from '../index.js';
import type {Closeable} from '../types/index.js';

export enum ScheduleType {
  startup,
  time,
  interval,
  manual,
}

export class ScheduleManager implements Closeable {
  log: TopDeps['log'];
  storageManager: TopDeps['storageManager'];
  schedulesModel: TopDeps['storageManager']['schedulesModel'];

  constructor({log, storageManager}: TopDeps) {
    this.log = log.child({source: ScheduleManager.name});

    this.storageManager = storageManager;

    this.schedulesModel = storageManager.schedulesModel;
  }

  active() {
    this.log.info('active');
  }

  async close() {
    this.log.info('close');
  }
}
