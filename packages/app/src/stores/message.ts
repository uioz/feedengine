import {defineStore} from 'pinia';

const MESSAGE_URL = '/api/message';

export const useMessageStore = defineStore('message', {
  state: () => ({}),
  actions: {
    connect() {
      new WebSocket(`${location.protocol}//${MESSAGE_URL}`);
    },
  },
});
