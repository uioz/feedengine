import {ChildProcess, fork} from 'node:child_process';
import type {Message} from './types/ipc.js';
import {MessageType} from './app.js';
import process from 'node:process';
import {dirname} from 'desm';
import {log} from './utils/log.js';
import {join} from 'node:path';

const rootDir = dirname(import.meta.url);

const debug = log({
  feedengine: {rootDir},
  prod: process.env.NODE_ENV === 'production',
}).child({
  source: 'daemon',
});

function createChild() {
  const cp = fork(join(rootDir, 'index.js'));

  return {
    cp,
  };
}

function handleMessage(cp: ChildProcess, cb: () => void) {
  let restartFlag = false;

  cp.on('message', (message: Message) => {
    if (message.type === MessageType.restart) {
      restartFlag = true;
      debug.info('recive restart message');
    }
  });

  cp.on('close', () => {
    if (restartFlag) {
      cp.removeAllListeners();
      debug.info('child_process was closed, prepared for restart');
      Promise.resolve().then(cb);
    }
  });
}

process.on('exit', () => debug.info('exit'));

function main() {
  const {cp} = createChild();

  debug.info('fork child_process');

  handleMessage(cp, main);
}

main();
