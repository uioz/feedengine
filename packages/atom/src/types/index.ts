// refer to http://www.intertwingly.net/wiki/pie/Rss20AndAtom10Compared#x
// http://www.atomenabled.org/developers/syndication
// https://datatracker.ietf.org/doc/html/rfc4287
import type {PluginContextStore, PluginContext, TaskContext} from 'feedengine';
import type {isValidatedAtomFeed, buildAtomFeed} from '../utils.js';

export interface AtomTaskContext {
  pluginVerison: string;
  pluginName: string;
  pluginSettings: PluginContext['settings'];
  inject: TaskContext<any>['inject'];
  sequelize: PluginContext['sequelize'];
  tool: PluginContext['tool'];
  requestPage: PluginContext['page']['request'];
  store: PluginContextStore;
}

export interface AtomStdFilter {
  /**
   * filter
   * apply to title summary context
   */
  f?: Array<string>;
  fTitle?: Array<string>;
  fSummary?: Array<string>;
  fContent?: Array<string>;
  fAuthor?: Array<string>;
  fCategory?: Array<string>;
  fDate?: Date;

  /**
   * filter out
   */
  fo?: Array<string>;
  foTitle?: Array<string>;
  foSummary?: Array<string>;
  foContent?: Array<string>;
  foAuthor?: Array<string>;
  foCategory?: Array<string>;
  foDate?: Date;

  limit?: number;

  /**
   * @default true
   */
  sorted?: boolean;

  /**
   * @default false
   */
  cache?: boolean;
}

export interface AtomTask {
  route: string;
  handler: <params, query>(
    context: AtomTaskContext,
    params: params,
    query: query
  ) => Promise<string | AtomFeed>;
}

declare module 'feedengine' {
  interface PluginRegisterContext {
    atom: Array<AtomTask>;
  }

  interface PluginContextStore {
    atom: {
      isValidatedAtomFeed: typeof isValidatedAtomFeed;
      buildAtomFeed: typeof buildAtomFeed;
    };
  }
}

export interface AtomPerson {
  name: string;
  email?: string;
  uri?: string;
}

export type AtomAuthor = AtomPerson;

export type AtomContributor = AtomPerson;

export interface AtomLink {
  /**
   * @default "alternate"
   */
  rel?: 'alternate' | 'related' | 'self' | 'enclosure' | 'via';
  /**
   * mimetype
   */
  type?: string;
  /**
   * RFC3066
   */
  hreflang?: string;
  title?: string;
  length?: string;
  href: string;
}

export interface AtomCategory {
  term: string;
  scheme?: string;
  label?: string;
}

export interface AtomTextContent {
  type: 'text' | 'html';
  content: string;
}

type mimeType = string;

export type AtomMediaContent = {
  type?: mimeType;
  src?: string;
  content?: string;
};

export type AtomContent = AtomMediaContent | AtomTextContent;

export type AtomPublished = Date;

export type AtomRights = AtomTextContent;

export type AtomSubtitle = AtomTextContent;

export type AtomSummary = AtomTextContent;

export type AtomTitle = AtomTextContent;

export type AtomUpdated = Date;

export type AtomId = string;

export interface AtomEntry {
  author?: Array<AtomAuthor>;
  category?: Array<AtomCategory>;
  content?: AtomContent;
  contributor?: Array<AtomContributor>;
  id: AtomId;
  link?: Array<AtomLink>;
  published?: AtomPublished;
  rights?: AtomRights;
  summary?: AtomSummary;
  title: AtomTitle;
  updated: AtomUpdated;
}

export interface AtomGenerator {
  uri?: string;
  version?: string;
  content: string;
}

export type AtomIcon = string;

export type AtomLogo = string;

export interface AtomFeed {
  author?: Array<AtomAuthor>;
  category?: Array<AtomCategory>;
  contributor?: Array<AtomContributor>;
  generator?: AtomGenerator;
  icon?: AtomIcon;
  id: AtomId;
  link?: Array<AtomLink>;
  logo?: AtomLogo;
  rights?: AtomRights;
  subtitle?: AtomSubtitle;
  title: AtomTitle;
  updated: AtomUpdated;
  entry: Array<AtomEntry>;
}
