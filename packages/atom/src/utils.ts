import {AtomFeed, AtomStdFilter, AtomTextContent} from './types/index.js';
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
    fContext: {
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
    foContext: {
      type: strOrArrStr,
    },
    foAuthor: {
      type: strOrArrStr,
    },
    foCategory: {
      type: strOrArrStr,
    },
    foDate: {
      type: strOrArrStr,
    },
    limit: {
      type: 'string',
    },
    sorted: {
      type: 'string',
    },
    cache: {
      type: 'string',
    },
  },
};

export function isValidatedAtomFeed(feed: unknown): feed is AtomFeed {
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

export function buildAtomFeed(atomFeed: AtomFeed): string {
  const doc = create({
    encoding: 'utf-8',
  }).ele('http://www.w3.org/2005/Atom', 'feed');

  if (atomFeed.author) {
    doc.ele(atomFeed.author.map((item) => ({author: {...item}})));
  }

  if (atomFeed.category) {
    doc.ele('category', atomFeed.category);
  }

  if (atomFeed.contributor) {
    doc.ele(atomFeed.contributor.map((item) => ({contributor: {...item}})));
  }

  if (atomFeed.generator) {
    const {content, ...rest} = atomFeed.generator;
    doc.ele('generator', rest).txt(content);
  }

  if (atomFeed.icon) {
    doc.ele('icon').txt(atomFeed.icon);
  }

  doc.ele('id').txt(atomFeed.id);

  if (atomFeed.link) {
    for (const link of atomFeed.link) {
      doc.ele('link', link);
    }
  }

  if (atomFeed.logo) {
    doc.ele('logo').txt(atomFeed.logo);
  }

  if (atomFeed.rights) {
    handleTextContent(doc, 'rights', atomFeed.rights);
  }

  if (atomFeed.subtitle) {
    handleTextContent(doc, 'subtitle', atomFeed.subtitle);
  }

  if (atomFeed.title) {
    handleTextContent(doc, 'title', atomFeed.title);
  }

  if (atomFeed.updated) {
    doc.ele('updated').txt(atomFeed.updated.toISOString());
  }

  return doc.end({format: 'xml'});
}
