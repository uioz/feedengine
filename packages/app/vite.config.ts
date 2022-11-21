import {defineConfig} from 'vite';
import vue from '@vitejs/plugin-vue';
import {resolve} from 'path';
import Pages from 'vite-plugin-pages';
import Layouts from 'vite-plugin-vue-layouts';
import Vuetify from 'vite-plugin-vuetify';

// https://vitejs.dev/config/
export default defineConfig({
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8080',
    },
    port: 3000,
  },
  resolve: {
    alias: {
      '@/': `${resolve(__dirname, 'src')}/`,
      '~/': `${resolve(__dirname, 'plugin')}/`,
    },
  },
  plugins: [
    vue(),
    Pages({
      extensions: ['vue'],
    }),
    Layouts(),
    Vuetify(),
  ],
});
