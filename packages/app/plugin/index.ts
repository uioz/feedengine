import {definePlugin} from 'feedengine-plugin';

export const plugin = definePlugin(() => ({
  app: {
    settingUrl: 'setting',
    dir: './dist',
  },
}));
