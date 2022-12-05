// stolen from https://github.com/utyfua/puppeteer-tough-cookie-store/blob/a37ea4ee1cbfd4b7eac604fc973d133650eff14b/src/utils.ts
import {Cookie, canonicalDomain} from 'tough-cookie';
import type {Protocol} from 'puppeteer-core';

export const PuppeteerInfinityExpires = -1;
export const ToughInfinityExpires = 'Infinity';

/**
 * convert puppeteer's sameSite to tough-cookie's sameSite
 */
export const p2tSameSite = (
  sameSite?: Protocol.Network.CookieSameSite
): Cookie.Properties['sameSite'] => {
  switch (sameSite) {
    case 'Lax':
      return 'lax';
    case 'Strict':
      return 'strict';
    case 'None':
    default:
      return 'none';
  }
};

export const serializeForTough = (puppetCookie: Protocol.Network.Cookie): Cookie => {
  const toughCookie: Cookie = new Cookie({
    key: puppetCookie.name,
    value: puppetCookie.value,
    expires:
      !puppetCookie.expires || puppetCookie.expires === PuppeteerInfinityExpires
        ? ToughInfinityExpires
        : new Date(puppetCookie.expires * 1000),
    domain: canonicalDomain(puppetCookie.domain),
    path: puppetCookie.path,
    secure: puppetCookie.secure,
    httpOnly: puppetCookie.httpOnly,
    sameSite: p2tSameSite(puppetCookie.sameSite),
    hostOnly: !puppetCookie.domain.startsWith('.'),

    // can we really skip them?
    // creation: currentDate,
    // lastAccessed: currentDate,
  });

  return toughCookie;
};
