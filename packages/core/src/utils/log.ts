import {pino, destination, type Logger} from 'pino';
import {join} from 'node:path';

export const DEFAULT_LOG_NAME = 'feedengine.log';

export type Log = Logger;

export function log({
  feedengine: {rootDir},
  prod,
}: {
  feedengine: {rootDir: string};
  prod: boolean;
}): Logger {
  return pino(
    prod
      ? destination({
          dest: join(rootDir, DEFAULT_LOG_NAME),
        })
      : undefined
  );
}
