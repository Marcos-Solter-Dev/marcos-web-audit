function decodeBasicEntities(value) {
  return String(value ?? '')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&nbsp;/gi, ' ');
}

export function stripTags(value) {
  return decodeBasicEntities(String(value).replace(/<script\b[\s\S]*?<\/script>/gi, ' ').replace(/<style\b[\s\S]*?<\/style>/gi, ' ').replace(/<[^>]*>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}

export function parseAttributes(tag) {
  const attrs = {};
  const regex = /([:\w-]+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|([^\s>]+)))?/g;
  let match;
  while ((match = regex.exec(tag)) !== null) {
    const key = match[1].toLowerCase();
    if (key === tag.match(/^<\/?\s*([\w-]+)/)?.[1]?.toLowerCase()) continue;
    attrs[key] = decodeBasicEntities(match[2] ?? match[3] ?? match[4] ?? '');
  }
  return attrs;
}

export function findFirstTag(html, tagName) {
  const match = html.match(new RegExp(`<${tagName}\\b[^>]*>([\\s\\S]*?)<\\/${tagName}>`, 'i'));
  return match ? stripTags(match[1]) : undefined;
}

export function findTags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b[^>]*>`, 'gi'))].map((m) => m[0]);
}

export function findPairedTags(html, tagName) {
  return [...html.matchAll(new RegExp(`<${tagName}\\b([^>]*)>([\\s\\S]*?)<\\/${tagName}>`, 'gi'))]
    .map((m) => ({ open: `<${tagName}${m[1]}>`, attrs: parseAttributes(`<${tagName}${m[1]}>`), inner: m[2], text: stripTags(m[2]) }));
}

export function findMetaContent(html, name) {
  const expected = name.toLowerCase();
  for (const tag of findTags(html, 'meta')) {
    const attrs = parseAttributes(tag);
    if ((attrs.name ?? '').toLowerCase() === expected) return attrs.content?.trim() || undefined;
  }
  return undefined;
}

export function findMetaProperty(html, property) {
  const expected = property.toLowerCase();
  for (const tag of findTags(html, 'meta')) {
    const attrs = parseAttributes(tag);
    if ((attrs.property ?? '').toLowerCase() === expected) return attrs.content?.trim() || undefined;
  }
  return undefined;
}

export function findLinkHref(html, rel) {
  const expected = rel.toLowerCase();
  for (const tag of findTags(html, 'link')) {
    const attrs = parseAttributes(tag);
    const relValues = (attrs.rel ?? '').toLowerCase().split(/\s+/);
    if (relValues.includes(expected)) return attrs.href?.trim() || undefined;
  }
  return undefined;
}

export function findLinksByRel(html, rel) {
  const expected = rel.toLowerCase();
  return findTags(html, 'link').map(parseAttributes).filter((attrs) => (attrs.rel ?? '').toLowerCase().split(/\s+/).includes(expected));
}

export function findHtmlLang(html) {
  const match = html.match(/<html\b[^>]*>/i);
  if (!match) return undefined;
  return parseAttributes(match[0]).lang?.trim() || undefined;
}

export function countOpenTags(html, tagName) {
  return (html.match(new RegExp(`<${tagName}\\b`, 'gi')) ?? []).length;
}

export function extractAnchors(html, baseUrl) {
  const urls = new Set();
  for (const tag of findTags(html, 'a')) {
    const href = parseAttributes(tag).href;
    if (!href || /^(#|mailto:|tel:|javascript:|data:)/i.test(href)) continue;
    try {
      const url = new URL(href, baseUrl);
      if (!['http:', 'https:'].includes(url.protocol)) continue;
      url.hash = '';
      urls.add(url.toString());
    } catch {
      // URL malformada é ignorada aqui e pode ser capturada por auditorias de marcação.
    }
  }
  return [...urls];
}

export function auditImages(html) {
  const images = findTags(html, 'img').map(parseAttributes);
  const withoutAlt = images.filter((attrs) => !Object.hasOwn(attrs, 'alt')).length;
  const withoutDimensions = images.filter((attrs) => !attrs.width || !attrs.height).length;
  const lazy = images.filter((attrs) => (attrs.loading ?? '').toLowerCase() === 'lazy').length;
  return { total: images.length, withoutAlt, withoutDimensions, lazy };
}

export function auditHeadings(html) {
  const headings = [];
  const regex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi;
  let match;
  while ((match = regex.exec(html)) !== null) headings.push({ level: Number(match[1]), text: stripTags(match[2]) });
  let skippedLevels = 0;
  for (let i = 1; i < headings.length; i += 1) {
    if (headings[i].level > headings[i - 1].level + 1) skippedLevels += 1;
  }
  return { headings, skippedLevels };
}

export function auditInteractiveElements(html) {
  const labelsFor = new Set(findPairedTags(html, 'label').map((label) => label.attrs.for).filter(Boolean));
  const controls = [
    ...findTags(html, 'input').map((tag) => ({ tag: 'input', attrs: parseAttributes(tag) })),
    ...findTags(html, 'select').map((tag) => ({ tag: 'select', attrs: parseAttributes(tag) })),
    ...findTags(html, 'textarea').map((tag) => ({ tag: 'textarea', attrs: parseAttributes(tag) }))
  ].filter(({ attrs }) => !['hidden', 'submit', 'button', 'reset', 'image'].includes((attrs.type ?? '').toLowerCase()));

  const unlabeledControls = controls.filter(({ attrs }) => {
    if (attrs['aria-label'] || attrs['aria-labelledby'] || attrs.title) return false;
    if (attrs.id && labelsFor.has(attrs.id)) return false;
    return true;
  }).length;

  const buttons = findPairedTags(html, 'button');
  const emptyButtons = buttons.filter(({ attrs, text }) => !text && !attrs['aria-label'] && !attrs['aria-labelledby'] && !attrs.title).length;

  const anchors = findPairedTags(html, 'a');
  const emptyLinks = anchors.filter(({ attrs, text, inner }) => {
    if (text || attrs['aria-label'] || attrs['aria-labelledby'] || attrs.title) return false;
    return !/<img\b[^>]*alt=(?:"[^"]+"|'[^']+'|[^\s>]+)/i.test(inner);
  }).length;

  const unsafeBlankLinks = anchors.filter(({ attrs }) => {
    if ((attrs.target ?? '').toLowerCase() !== '_blank') return false;
    const rel = (attrs.rel ?? '').toLowerCase().split(/\s+/);
    return !rel.includes('noopener') && !rel.includes('noreferrer');
  }).length;

  return { controls: controls.length, unlabeledControls, buttons: buttons.length, emptyButtons, links: anchors.length, emptyLinks, unsafeBlankLinks };
}

export function auditResources(html, baseUrl) {
  const scripts = findTags(html, 'script').map(parseAttributes);
  const stylesheets = findTags(html, 'link').map(parseAttributes).filter((attrs) => (attrs.rel ?? '').toLowerCase().split(/\s+/).includes('stylesheet'));
  const images = findTags(html, 'img').map(parseAttributes);
  const resources = [];

  for (const attrs of scripts) if (attrs.src) resources.push({ kind: 'script', url: absolute(attrs.src, baseUrl), attrs });
  for (const attrs of stylesheets) if (attrs.href) resources.push({ kind: 'style', url: absolute(attrs.href, baseUrl), attrs });
  for (const attrs of images) if (attrs.src) resources.push({ kind: 'image', url: absolute(attrs.src, baseUrl), attrs });

  const renderBlockingScripts = scripts.filter((attrs) => attrs.src && !Object.hasOwn(attrs, 'async') && !Object.hasOwn(attrs, 'defer') && (attrs.type ?? '').toLowerCase() !== 'module').length;
  const externalWithoutSri = resources.filter((resource) => ['script', 'style'].includes(resource.kind) && resource.url && new URL(resource.url).origin !== new URL(baseUrl).origin && !resource.attrs.integrity).length;
  const mixedContent = resources.filter((resource) => resource.url?.startsWith('http://') && new URL(baseUrl).protocol === 'https:').length;

  return { scripts: scripts.length, stylesheets: stylesheets.length, images: images.length, total: resources.length, renderBlockingScripts, externalWithoutSri, mixedContent, resources };
}

export function countInlineEventHandlers(html) {
  return (html.match(/\son[a-z]+\s*=/gi) ?? []).length;
}

export function findCharset(html) {
  for (const tag of findTags(html, 'meta')) {
    const attrs = parseAttributes(tag);
    if (attrs.charset) return attrs.charset;
    if ((attrs['http-equiv'] ?? '').toLowerCase() === 'content-type' && /charset=/i.test(attrs.content ?? '')) {
      return attrs.content.match(/charset=([^;\s]+)/i)?.[1];
    }
  }
  return undefined;
}

export function hasDoctype(html) {
  return /^\s*<!doctype\s+html/i.test(html);
}

export function countJsonLd(html) {
  return findPairedTags(html, 'script').filter(({ attrs }) => (attrs.type ?? '').toLowerCase() === 'application/ld+json').length;
}

export function findForms(html, baseUrl) {
  return findTags(html, 'form').map((tag) => {
    const attrs = parseAttributes(tag);
    let action;
    try { action = attrs.action ? new URL(attrs.action, baseUrl).toString() : baseUrl; } catch { action = attrs.action; }
    return { attrs, action };
  });
}

function absolute(value, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    if (!['http:', 'https:'].includes(url.protocol)) return undefined;
    return url.toString();
  } catch {
    return undefined;
  }
}
