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
  log: TopDeps['log'];
  messageManager: TopDeps['messageManager'];
  #browser!: Browser;
  isOpenFirst = true;
  activedPagePool: Array<PuppeteerCore.Page> = [];
  freePagePool: Array<PuppeteerCore.Page> = [];

  constructor({log, appManager, messageManager}: TopDeps) {
    this.log = log.child({source: DriverManager.name});
    this.appManager = appManager;
    this.messageManager = messageManager;
  }

  async init() {
    const userConfig = await this.appManager.getDriverConfig();

    if (userConfig.executablePath && userConfig.userDataDir) {
      try {
        this.#browser = await puppeteer.launch({
          ...userConfig,
          args: ['--no-sandbox'],
        } as LaunchOptions);
      } catch (error) {
        this.messageManager.notification(DriverManager.name).error(error + '');
      }
    } else {
      this.messageManager.confirm(DriverManager.name).error('required parameters missing', [
        {
          label: 'go to settings',
          type: 'link',
          payload: `/settings#${DriverManager.name}`,
        },
      ]);
    }

    this.log.info(`init`);
  }

  async requestPage() {
    const freePage = this.freePagePool.shift();

    if (freePage) {
      return freePage;
    }

    let page: PuppeteerCore.Page;

    if (this.isOpenFirst) {
      this.isOpenFirst = false;

      page = (await this.#browser.pages())[0];
    } else {
      page = await this.#browser.newPage();
    }

    this.activedPagePool.push(page);

    return page;
  }

  releasePage(page: PuppeteerCore.Page, force = false) {
    this.activedPagePool.splice(
      this.activedPagePool.findIndex((item) => item === page),
      1
    );

    if (force) {
      page.close();
    } else {
      this.freePagePool.push(page);
    }
  }

  async close() {
    await this.#browser.close();

    this.log.info(`close`);
  }
}
