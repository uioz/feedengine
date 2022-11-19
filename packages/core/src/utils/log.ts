import {pino, destination, type Logger} from 'pino';
import type {SonicBoom} from 'sonic-boom';
import {join} from 'node:path';
import {env} from 'node:process';

export const DEFAULT_LOG_NAME = 'feedengine.log';

export type Log = Logger<SonicBoom>;

export function log({feedengine: {rootDir}}: {feedengine: {rootDir: string}}) {
  return pino(
    env.NODE_ENV === 'production'
      ? destination({
          dest: join(rootDir, DEFAULT_LOG_NAME),
        })
      : undefined
  );
}
