import {definePlugin} from 'feedengine-plugin';

export const plugin = definePlugin(() => {
  return {
    app: {
      dir: './dist',
      settingUrl: 'settings',
      type: 'spa',
    },
  };
});
