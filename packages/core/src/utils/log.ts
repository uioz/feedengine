import {pino, destination, type Logger} from 'pino';
import type {SonicBoom} from 'sonic-boom';
import {join} from 'node:path';

export const DEFAULT_LOG_NAME = 'feedengine.log';

export type Log = Logger<SonicBoom>;

export function log({cwd}: {cwd: string}) {
  return pino(
    destination({
      dest: join(cwd, DEFAULT_LOG_NAME),
    })
  );
}
