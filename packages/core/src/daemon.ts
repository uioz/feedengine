import {ChildProcess, fork} from 'node:child_process';
import {type Message, MessageType} from './types/ipc.js';
import Debug from 'debug';
import process from 'node:process';

const debug = Debug('daemon');

function createChild() {
  const cp = fork('./index.js');

  return {
    cp,
  };
}

function handleMessage(cp: ChildProcess, cb: () => void) {
  let restartFlag = false;

  cp.on('message', (message: Message) => {
    if (message.type === MessageType.restart) {
      restartFlag = true;
      debug('recive restart message');
    }
  });

  cp.on('close', () => {
    if (restartFlag) {
      cp.removeAllListeners();
      debug('child_process was closed, prepared for restart');
      Promise.resolve().then(cb);
    }
  });
}

process.on('exit', () => debug('exit'));

function main() {
  const {cp} = createChild();

  debug('fork child_process');

  handleMessage(cp, main);
}

main();
