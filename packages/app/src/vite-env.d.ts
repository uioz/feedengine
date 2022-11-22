/// <reference types="vite/client" />
/// <reference types="vite-plugin-pages/client" />
/// <reference types="vite-plugin-vue-layouts/client" />

declare module '*.vue' {
  import type {DefineComponent} from 'vue';
  // eslint-disable-next-line @typescript-eslint/ban-types
  const component: DefineComponent<{}, {}, any>;
  export default component;
}

interface ImportMetaEnv {
  readonly VITE_WS_MESSAGE: string;
  // more env variables...
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
