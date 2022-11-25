export * from './task.js';
export * from './ipc.js';
export * from './message.js';
export * from './plugin.js';
export * from './settings.js';
export * from './event.js';
export * from './api.js';
export * from './schedule.js';

export interface Initable {
  init(): Promise<void>;
}

export interface Closeable {
  close(): Promise<void>;
}
