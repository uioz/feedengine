export interface Initable {
  init(): Promise<void>;
}

export interface Closeable {
  close(): Promise<void>;
}
