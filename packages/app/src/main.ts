import './style.css';
import 'vuetify/styles';
import 'material-design-icons-iconfont/dist/material-design-icons.css';
import {createApp, h} from 'vue';
import {RouterView} from 'vue-router';
import {router} from './routers/index';
import {createPinia} from 'pinia';
import {createVuetify} from 'vuetify';
import {aliases, md} from 'vuetify/iconsets/md';
import {md3} from 'vuetify/blueprints';

createApp({
  render: () => h(RouterView),
})
  .use(
    createVuetify({
      // theme: false,
      blueprint: md3,
      icons: {
        defaultSet: 'md',
        aliases,
        sets: {
          md,
        },
      },
    })
  )
  .use(createPinia())
  .use(router)
  .mount('#app');
