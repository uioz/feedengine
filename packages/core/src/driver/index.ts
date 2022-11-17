import * as PuppeteerCore from 'puppeteer-core';
import type {Browser, LaunchOptions} from 'puppeteer-core';
import {PuppeteerExtra} from 'puppeteer-extra';
import Stealth from 'puppeteer-extra-plugin-stealth';
import {Initable, Closeable} from '../types/index.js';
import type {TopDeps} from '../index.js';

const puppeteer = new PuppeteerExtra(PuppeteerCore, undefined);

puppeteer.use(Stealth());

export class DriverManager implements Initable, Closeable {
  appManager: TopDeps['appManager'];
  debug: TopDeps['debug'];
  #browser!: Browser;

  constructor({debug, appManager}: TopDeps) {
    this.debug = debug;
    this.appManager = appManager;
  }

  async init() {
    if (this.appManager.firstBooting) {
      return;
    }

    const userConfig = await this.appManager.getDriverConfig();

    if (userConfig.executablePath && userConfig.userDataDir) {
      this.#browser = await puppeteer.launch({
        ...userConfig,
        args: ['--no-sandbox'],
      } as LaunchOptions);

      // const pages = await this.#browser.pages();

      // let page: Page;

      // if (pages.length > 0) {
      //   page = pages[0];
      // } else {
      //   page = await this.#browser.newPage();
      // }

      // await page.goto('https://www.baidu.com', {
      //   waitUntil: 'networkidle0',
      // });
    } else {
      // TODO: send message
    }

    this.debug(`${DriverManager.name} init`);
  }

  async close() {
    if (!this.appManager.firstBooting) {
      await this.#browser.close();
    }

    this.debug(`${DriverManager.name} init`);
  }
}
