// refer to http://www.intertwingly.net/wiki/pie/Rss20AndAtom10Compared#x
// http://www.atomenabled.org/developers/syndication
// https://datatracker.ietf.org/doc/html/rfc4287
import type {Model, InferAttributes, InferCreationAttributes} from 'sequelize';

export interface AtomPerson {
  name: string;
  email?: string;
  uri?: string;
}

export type AtomAuthor = AtomPerson;

export type AtomContributor = AtomPerson;

export interface AtomLink {
  rel?: 'alternate' | 'related' | 'self' | 'enclosure' | 'via';
  /**
   * mimetype
   */
  type?: string;
  /**
   * RFC3066
   */
  hreflang?: '';
  title?: '';
  length?: '';
  href: string;
}

export interface AtomCategory {
  term: string;
  scheme?: string;
  label?: string;
}

export interface AtomContent {
  /**
   * mimetype
   */
  type?: 'html' | 'xhtml' | 'text' | string;
  src?: string;
  content: string;
}

export interface AtomPluginMainTable {
  read: boolean;
  plugin: string;
  task: string;
  //
  id: string;
  author: Array<AtomAuthor>;
  category: Array<AtomCategory>;
  contributor: Array<AtomContributor>;
  summary: string;
  lang: string;
  content: AtomContent;
  updated: Date;
  link: Array<AtomLink>;
  title: string;
}

export interface AtomPluginMainTableModel
  extends AtomPluginMainTable,
    Model<
      InferAttributes<AtomPluginMainTableModel>,
      InferCreationAttributes<AtomPluginMainTableModel>
    > {}
