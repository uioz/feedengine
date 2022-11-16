// https://stackoverflow.com/questions/72457791/typescript-packages-that-ship-with-mjs-and-d-ts-but-without-d-mts-how-to-i
// copy from mitt@3.0.0
// eslint-disable-next-line @typescript-eslint/triple-slash-reference
/// <reference path="index.d.ts" />
import mitt, {Emitter} from 'mitt';

type Events = {
  name: string;
};

export type Eventbus = Emitter<Events>;

export const eventBus = mitt<Events>();
