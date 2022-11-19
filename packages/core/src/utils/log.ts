import {pino, destination, type Logger} from 'pino';
import {join} from 'node:path';
import {env} from 'node:process';

export const DEFAULT_LOG_NAME = 'feedengine.log';

export type Log = Logger;

export function log({feedengine: {rootDir}}: {feedengine: {rootDir: string}}): Logger {
  return pino(
    env.NODE_ENV === 'production'
      ? destination({
          dest: join(rootDir, DEFAULT_LOG_NAME),
        })
      : undefined
  );
}
