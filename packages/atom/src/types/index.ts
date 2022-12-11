// refer to http://www.intertwingly.net/wiki/pie/Rss20AndAtom10Compared#x
// http://www.atomenabled.org/developers/syndication
// https://datatracker.ietf.org/doc/html/rfc4287
import type {ModelStatic} from 'sequelize';
import type {Atom} from '../model/index.js';

export type AtomModel = Atom;

declare module 'feedengine' {
  interface PluginContextStore {
    atomModel: ModelStatic<AtomModel>;
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
