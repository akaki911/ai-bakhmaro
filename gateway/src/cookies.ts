export const stripSecurityPrefix = (name: string): string =>
  name.replace(/^__Host-/, '').replace(/^__Secure-/, '');

export const createSessionCookieChecker = (names: Iterable<string>) => {
  const knownNames = new Set(names);

  return (name: string | undefined | null): boolean => {
    if (!name) {
      return false;
    }

    const trimmed = name.trim();
    if (trimmed.length === 0) {
      return false;
    }

    const baseName = stripSecurityPrefix(trimmed);

    return knownNames.has(trimmed) || knownNames.has(baseName) || trimmed.endsWith('.sid');
  };
};

export type CookieNormaliseOptions = {
  cookieDomain: string | null;
  cookieSecure: boolean;
  hardenedCookieNames: ReadonlySet<string>;
};

export const normaliseCookie = (cookie: string, options: CookieNormaliseOptions): string => {
  const { cookieDomain, cookieSecure, hardenedCookieNames } = options;

  const parts = cookie.split(';').map((part) => part.trim()).filter(Boolean);
  if (parts.length === 0) {
    return cookie;
  }

  const [nameValue, ...attributeParts] = parts;
  const equalsIndex = nameValue.indexOf('=');
  if (equalsIndex < 0) {
    return cookie;
  }

  const rawName = nameValue.slice(0, equalsIndex).trim();
  const cookieValue = nameValue.slice(equalsIndex + 1);
  const baseName = stripSecurityPrefix(rawName);
  const shouldHarden =
    hardenedCookieNames.has(rawName) || hardenedCookieNames.has(baseName) || rawName.endsWith('.sid');
  const shouldUseHostPrefix = shouldHarden && cookieSecure;

  let domainAttr: string | null = null;
  let pathAttr: string | null = null;
  let hasHttpOnly = false;
  const preserved: string[] = [];

  attributeParts.forEach((attr) => {
    const lower = attr.toLowerCase();
    if (lower.startsWith('domain=')) {
      domainAttr = attr;
      return;
    }
    if (lower.startsWith('path=')) {
      pathAttr = attr;
      return;
    }
    if (lower.startsWith('samesite=')) {
      return;
    }
    if (lower === 'secure') {
      return;
    }
    if (lower === 'httponly') {
      hasHttpOnly = true;
      return;
    }
    preserved.push(attr);
  });

  let finalNameValue = nameValue;
  if (shouldUseHostPrefix) {
    const targetName = `__Host-${baseName}`;
    if (rawName !== targetName) {
      finalNameValue = `${targetName}=${cookieValue}`;
    }
  }

  const attributes: string[] = [...preserved];

  if (!shouldUseHostPrefix) {
    if (cookieDomain) {
      attributes.push(`Domain=${cookieDomain}`);
    } else if (domainAttr) {
      attributes.push(domainAttr);
    }
  }

  if (shouldUseHostPrefix) {
    attributes.push('Path=/');
  } else if (pathAttr) {
    attributes.push(pathAttr);
  }

  attributes.push('SameSite=None');

  if (cookieSecure) {
    attributes.push('Secure');
  }

  if (shouldHarden || hasHttpOnly) {
    attributes.push('HttpOnly');
  }

  return [finalNameValue, ...attributes].join('; ');
};

export const createCookieNormaliser = (options: CookieNormaliseOptions) => {
  const defaults = {
    cookieDomain: options.cookieDomain,
    cookieSecure: options.cookieSecure,
    hardenedCookieNames: options.hardenedCookieNames,
  } as const;

  return (cookie: string, override?: Partial<CookieNormaliseOptions>): string =>
    normaliseCookie(cookie, {
      cookieDomain: override?.cookieDomain ?? defaults.cookieDomain,
      cookieSecure: override?.cookieSecure ?? defaults.cookieSecure,
      hardenedCookieNames: override?.hardenedCookieNames ?? defaults.hardenedCookieNames,
    });
};
