import {AtomEntry, AtomFeed, AtomStdFilter, AtomTextContent} from './types/index.js';
import {create} from 'xmlbuilder2';

const strOrArrStr = ['string', 'array'];

export const querystringSchema: {type: string; properties: Record<keyof AtomStdFilter, any>} = {
  type: 'object',
  properties: {
    f: {
      type: strOrArrStr,
    },
    fTitle: {
      type: strOrArrStr,
    },
    fSummary: {
      type: strOrArrStr,
    },
    fContent: {
      type: strOrArrStr,
    },
    fAuthor: {
      type: strOrArrStr,
    },
    fCategory: {
      type: strOrArrStr,
    },
    fDate: {
      type: 'string',
      format: 'date-time',
    },
    fo: {
      type: strOrArrStr,
    },
    foTitle: {
      type: strOrArrStr,
    },
    foSummary: {
      type: strOrArrStr,
    },
    foContent: {
      type: strOrArrStr,
    },
    foAuthor: {
      type: strOrArrStr,
    },
    foCategory: {
      type: strOrArrStr,
    },
    foDate: {
      type: 'string',
      format: 'date-time',
    },
    limit: {
      type: 'string',
      pattern: `^\\d+$`,
    },
    sorted: {
      type: 'string',
      pattern: `^(true|false)$`,
    },
    cache: {
      type: 'string',
      pattern: `^(true|false)$`,
    },
  },
};

export function transQueryToStdFilter(query: AtomStdFilter) {
  for (const key of Object.keys(query) as Array<keyof AtomStdFilter>) {
    switch (key) {
      case 'f':
      case 'fTitle':
      case 'fSummary':
      case 'fContent':
      case 'fAuthor':
      case 'fCategory':
      case 'fo':
      case 'foTitle':
      case 'foSummary':
      case 'foContent':
      case 'foAuthor':
      case 'foCategory':
        if (!Array.isArray(query[key])) {
          query[key] = [query[key] as any];
        }
        break;
      case 'fDate':
      case 'foDate':
        query[key] = new Date(query[key]!);
        break;
      case 'sorted':
      case 'cache':
        query[key] = !!query[key];
        break;
      case 'limit':
        query[key] = parseInt(query[key] as any);
        break;
    }
  }
}

function mustHaveAuthor(feed: Record<string, any>, haveEntry: boolean) {
  if (feed.author?.name === undefined) {
    if (!haveEntry) {
      throw new Error('atom:feed elements MUST contain one or more atom:author elements');
    }

    for (const entry of feed.entry) {
      if (typeof entry?.author?.name !== 'string') {
        throw new Error(
          `atom:feed elements MUST contain one or more atom:author elements, unless all of the atom:feed element's child atom:entry elements contain at least one atom:author element.`
        );
      }
    }
  }
}

function mustHaveId(feed: Record<string, any>, haveEntry: boolean) {
  if (typeof feed.id !== 'string') {
    throw new Error('atom:feed elements MUST contain exactly one atom:id element.');
  }

  if (haveEntry) {
    for (const entry of feed.entry) {
      if (typeof entry.id !== 'string') {
        throw new Error('atom:entry elements MUST contain exactly one atom:id element.');
      }
    }
  }
}

function mustHaveTitle(feed: Record<string, any>, haveEntry: boolean) {
  if (typeof feed.title !== 'string') {
    throw new Error('atom:feed elements MUST contain exactly one atom:title element.');
  }

  if (haveEntry) {
    for (const entry of feed.entry) {
      if (typeof entry.title !== 'string') {
        throw new Error('atom:entry elements MUST contain exactly one atom:title element.');
      }
    }
  }
}

function mustHaveUpdated(feed: Record<string, any>, haveEntry: boolean) {
  if (typeof feed.updated !== 'object') {
    throw new Error('atom:feed elements MUST contain exactly one atom:updated element.');
  }

  if (haveEntry) {
    for (const entry of feed.entry) {
      if (typeof entry.updated !== 'object') {
        throw new Error('atom:entry elements MUST contain exactly one atom:updated element.');
      }
    }
  }
}

function mustHaveContent(entrys: Array<Partial<AtomEntry>>) {
  for (const entry of entrys) {
    if (!entry.content) {
      if (Array.isArray(entry.link) && entry.link.find((link) => link.rel === 'alternate')) {
        return;
      }
      throw new Error(
        'atom:entry elements that contain no child atom:content element MUST contain at least one atom:link element with a rel attribute value of "alternate".'
      );
    }
  }
}

export function isValidatedAtomFeed(feed: Partial<AtomFeed>): feed is AtomFeed {
  const haveEntry = Array.isArray(feed.entry);

  mustHaveAuthor(feed, haveEntry);

  mustHaveId(feed, haveEntry);

  mustHaveTitle(feed, haveEntry);

  mustHaveUpdated(feed, haveEntry);

  if (haveEntry) {
    mustHaveContent(feed.entry!);
    // TODO: check summary
  }

  return true;
}

function handleTextContent(doc: ReturnType<typeof create>, name: string, node: AtomTextContent) {
  switch (node.type) {
    case 'html':
      doc.ele(name).dat(node.content);
      break;

    case 'text':
      doc.ele(name).txt(node.content);
      break;
  }
}

function isTextContent(data: Record<string, any>): data is AtomTextContent {
  if (data.type === 'html' || data.type === 'text') {
    return true;
  }

  return false;
}

function handleAtomElement(doc: ReturnType<typeof create>, data: Partial<AtomFeed & AtomEntry>) {
  if (data.author) {
    doc.ele(data.author.map((item) => ({author: {...item}})));
  }

  if (data.category) {
    doc.ele('category', data.category);
  }

  if (data.contributor) {
    doc.ele(data.contributor.map((item) => ({contributor: {...item}})));
  }

  if (data.generator) {
    const {content, ...rest} = data.generator;
    doc.ele('generator', rest).txt(content);
  }

  if (data.icon) {
    doc.ele('icon').txt(data.icon);
  }

  if (data.id) {
    doc.ele('id').txt(data.id);
  }

  if (data.link) {
    for (const link of data.link) {
      doc.ele('link', link);
    }
  }

  if (data.logo) {
    doc.ele('logo').txt(data.logo);
  }

  if (data.rights) {
    handleTextContent(doc, 'rights', data.rights);
  }

  if (data.subtitle) {
    handleTextContent(doc, 'subtitle', data.subtitle);
  }

  if (data.title) {
    handleTextContent(doc, 'title', data.title);
  }

  if (data.updated) {
    doc.ele('updated').txt(data.updated.toISOString());
  }

  if (data.content) {
    if (isTextContent(data.content)) {
      handleTextContent(doc, 'content', data.content);
    } else if (data.content.src) {
      const {type, src} = data.content;
      doc.ele('content', {
        type,
        src,
      });
    } else if (data.content.content) {
      doc
        .ele('content', {
          type: data.content.type,
        })
        .txt(data.content.content);
    }
  }

  if (data.published) {
    doc.ele('published').txt(data.published.toISOString());
  }

  if (data.summary) {
    handleTextContent(doc, 'summary', data.summary);
  }
}

export function buildAtomFeed(atomFeed: AtomFeed): string {
  const doc = create({
    encoding: 'utf-8',
  }).ele('http://www.w3.org/2005/Atom', 'feed');

  handleAtomElement(doc, atomFeed);

  for (const entry of atomFeed.entry) {
    handleAtomElement(doc.ele('entry'), entry);
  }

  return doc.end({format: 'xml'});
}
