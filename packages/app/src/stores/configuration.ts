import {defineStore} from 'pinia';
import type {AppSettings} from 'feedengine';

interface ConfigurationStoreState {
  settings: AppSettings | null;
}

export const useConfigurationStore = defineStore('configuration', {
  state: (): ConfigurationStoreState => ({
    settings: null,
  }),
  actions: {
    setDefaultConfiguration(settings: AppSettings) {
      this.settings = settings;
    },
  },
});
