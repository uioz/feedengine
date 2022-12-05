import * as PuppeteerCore from 'puppeteer-core';
import type {Browser, LaunchOptions} from 'puppeteer-core';
import {PuppeteerExtra} from 'puppeteer-extra';
import Stealth from 'puppeteer-extra-plugin-stealth';
import {Initable, AppSettings} from '../types/index.js';
import type {TopDeps} from '../index.js';
import * as fastq from 'fastq';
import type {queueAsPromised} from 'fastq';

const puppeteer = new PuppeteerExtra(PuppeteerCore, undefined);

puppeteer.use(Stealth());

export class DriverManager implements Initable {
  appManager: TopDeps['appManager'];
  log: TopDeps['log'];
  messageManager: TopDeps['messageManager'];
  #browser!: Browser;
  isOpenFirst = true;
  activedPagePool = new Map<PuppeteerCore.Page, () => void>();
  freePagePool: Array<PuppeteerCore.Page> = [];
  performance!: AppSettings['performance'];
  requestPageQueue!: queueAsPromised<(value: PuppeteerCore.Page) => void>;

  constructor({log, appManager, messageManager}: TopDeps) {
    this.log = log.child({source: DriverManager.name});
    this.appManager = appManager;
    this.messageManager = messageManager;
  }

  private async getPage() {
    let page = this.freePagePool.shift();

    if (!page) {
      if (this.isOpenFirst) {
        this.isOpenFirst = false;

        page = (await this.#browser.pages())[0];
      } else {
        page = await this.#browser.newPage();
      }
    }

    return page;
  }

  async init() {
    this.performance = await this.appManager.getPerformance();

    this.requestPageQueue = fastq.promise(async (resolve) => {
      const page = await this.getPage();

      resolve(page);

      await new Promise<void>((resolve) =>
        this.activedPagePool.set(page as PuppeteerCore.Page, resolve)
      );
    }, this.performance.pagesConcurrency);

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

  requestPage(force = false) {
    if (force) {
      return this.getPage();
    }

    return new Promise<PuppeteerCore.Page>((resolve) => {
      this.requestPageQueue.push(resolve);
    });
  }

  async releasePage(page: PuppeteerCore.Page, force = false) {
    if (force) {
      await page.close();
    } else {
      this.freePagePool.push(page);
    }

    const release = this.activedPagePool.get(page);

    if (release) {
      this.activedPagePool.delete(page);
      release();
    }
  }
}
