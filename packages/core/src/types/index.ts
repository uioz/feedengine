export * from './atom.js';
export * from './ipc.js';
export * from './message.js';
export * from './plugin.js';
export * from './settings.js';

export interface Initable {
  init(): Promise<void>;
}

export interface Closeable {
  close(): Promise<void>;
}
