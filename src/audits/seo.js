import {
  countJsonLd,
  countOpenTags,
  findFirstTag,
  findHtmlLang,
  findLinkHref,
  findLinksByRel,
  findMetaContent,
  findMetaProperty,
  findPairedTags,
  findTags,
  parseAttributes,
  stripTags
} from '../utils/html.js';

export function auditSeo(html, pageUrl) {
  const title = findFirstTag(html, 'title');
  const description = findMetaContent(html, 'description');
  const canonical = findLinkHref(html, 'canonical');
  const language = findHtmlLang(html);
  const viewport = findMetaContent(html, 'viewport');
  const robots = findMetaContent(html, 'robots');
  const ogTitle = findMetaProperty(html, 'og:title');
  const ogDescription = findMetaProperty(html, 'og:description');
  const ogImage = findMetaProperty(html, 'og:image');
  const ogUrl = findMetaProperty(html, 'og:url');
  const ogType = findMetaProperty(html, 'og:type');
  const twitterCard = findMetaContent(html, 'twitter:card');
  const twitterTitle = findMetaContent(html, 'twitter:title');
  const twitterDescription = findMetaContent(html, 'twitter:description');
  const twitterImage = findMetaContent(html, 'twitter:image');
  const h1Count = countOpenTags(html, 'h1');
  const h1Text = findFirstTag(html, 'h1');
  const jsonLd = countJsonLd(html);
  const favicon = findLinkHref(html, 'icon') || findLinkHref(html, 'shortcut');
  const titleTags = findPairedTags(html, 'title');
  const metas = findTags(html, 'meta').map(parseAttributes);
  const descriptions = metas.filter((a) => (a.name ?? '').toLowerCase() === 'description');
  const robotsMetas = metas.filter((a) => (a.name ?? '').toLowerCase() === 'robots');
  const canonicalLinks = findLinksByRel(html, 'canonical');
  const alternateLinks = findLinksByRel(html, 'alternate').filter((a) => a.hreflang);
  const anchors = findPairedTags(html, 'a');
  const text = stripTags(html);

  const titleGood = title && title.length >= 15 && title.length <= 65;
  const descriptionGood = description && description.length >= 70 && description.length <= 170;
  const noindex = /(?:^|,)\s*noindex\b/i.test(robots ?? '');
  const nofollow = /(?:^|,)\s*nofollow\b/i.test(robots ?? '');
  const placeholderTitle = /^(home|homepage|index|untitled|document|new page|in[ií]cio|sem t[ií]tulo)$/i.test((title ?? '').trim());
  const h1GoodLength = !h1Text || (h1Text.length >= 5 && h1Text.length <= 90);
  const viewportGood = viewport && /width\s*=\s*device-width/i.test(viewport) && /initial-scale\s*=\s*1(?:\.0+)?/i.test(viewport);
  const soft404Signals = /\b(?:404|not found|p[aá]gina n[aã]o encontrada)\b/i.test(`${title ?? ''} ${h1Text ?? ''}`);
  const genericLinks = anchors.filter(({ text: value }) => /^(clique aqui|aqui|saiba mais|click here|read more)$/i.test(value.trim())).length;
  const hreflangInvalid = alternateLinks.filter((a) => !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$|^x-default$/i.test(a.hreflang ?? '')).length;
  const hreflangNoHref = alternateLinks.filter((a) => !a.href).length;
  const hasXDefault = alternateLinks.some((a) => (a.hreflang ?? '').toLowerCase() === 'x-default');
  const metaKeywords = findMetaContent(html, 'keywords');
  const metaGenerator = findMetaContent(html, 'generator');

  let canonicalSeverity = canonical ? 'pass' : 'warning';
  let canonicalMessage = canonical ? `Canonical: ${canonical}` : 'rel="canonical" não encontrado.';
  let canonicalAbsolute = false;
  let canonicalSameOrigin = false;
  let canonicalSelf = false;
  let canonicalHasFragment = false;
  if (canonical && pageUrl) {
    try {
      const canonicalUrl = new URL(canonical, pageUrl);
      canonicalAbsolute = /^[a-z][a-z0-9+.-]*:\/\//i.test(canonical);
      canonicalSameOrigin = canonicalUrl.origin === new URL(pageUrl).origin;
      canonicalSelf = normalizedUrl(canonicalUrl.toString()) === normalizedUrl(pageUrl);
      canonicalHasFragment = Boolean(canonicalUrl.hash);
      if (!['http:', 'https:'].includes(canonicalUrl.protocol)) canonicalSeverity = 'warning';
    } catch {
      canonicalSeverity = 'fail';
      canonicalMessage = `Canonical inválida: ${canonical}`;
    }
  }

  const ogImageAbsolute = ogImage ? isAbsoluteHttpUrl(ogImage) : false;
  const ogUrlAbsolute = ogUrl ? isAbsoluteHttpUrl(ogUrl) : false;
  const twitterComplete = twitterCard && (twitterTitle || ogTitle) && (twitterDescription || ogDescription) && (twitterImage || ogImage);
  const bodyWordCount = text.split(/\s+/).filter(Boolean).length;
  const searchInput = findTags(html, 'input').map(parseAttributes).some((a) => (a.type ?? '').toLowerCase() === 'search' || /search|busca|pesquisa/i.test(`${a.name ?? ''} ${a.id ?? ''}`));

  const items = [
    seoItem('title', 'Título da página', title ? (titleGood ? 'pass' : 'warning') : 'fail', title ? `Título com ${title.length} caracteres: ${title}` : 'Nenhum <title> encontrado.', !title ? 'Adicione um <title> único e descritivo.' : titleGood ? undefined : 'Mantenha o título claro e, como referência, entre 15 e 65 caracteres.', 3),
    seoItem('description', 'Meta description', description ? (descriptionGood ? 'pass' : 'warning') : 'warning', description ? `Description com ${description.length} caracteres.` : 'Meta description não encontrada.', descriptionGood ? undefined : 'Escreva uma descrição clara; normalmente 70–170 caracteres funcionam bem.', 2),
    seoItem('h1', 'Estrutura de H1', h1Count === 1 ? 'pass' : h1Count === 0 ? 'fail' : 'warning', `Quantidade de H1: ${h1Count}.`, h1Count === 1 ? undefined : 'Mantenha uma hierarquia de títulos clara e um H1 principal.', 2),
    seoItem('canonical', 'URL canônica', canonicalSeverity, canonicalMessage, canonical ? undefined : 'Considere definir canonical quando houver risco de conteúdo duplicado.', 2),
    seoItem('lang', 'Idioma da página', language ? 'pass' : 'warning', language ? `Idioma declarado: ${language}` : 'Atributo lang não encontrado no <html>.', language ? undefined : 'Defina o idioma, por exemplo <html lang="pt-BR">.', 1),
    seoItem('viewport', 'Viewport responsivo', viewportGood ? 'pass' : viewport ? 'warning' : 'warning', viewport ? `Meta viewport: ${viewport}` : 'Meta viewport não encontrada.', viewportGood ? undefined : 'Use pelo menos width=device-width, initial-scale=1.', 1),
    seoItem('robots-meta', 'Meta robots', noindex ? 'warning' : 'pass', noindex ? `A página declara noindex (${robots}).` : robots ? `Meta robots: ${robots}` : 'Nenhum noindex foi detectado.', noindex ? 'Confirme se essa página realmente deve ficar fora de mecanismos de busca.' : undefined, 2),
    seoItem('open-graph', 'Open Graph', ogTitle && ogDescription && ogImage ? 'pass' : 'info', ogTitle && ogDescription && ogImage ? 'og:title, og:description e og:image encontrados.' : 'Open Graph está ausente ou incompleto.', ogTitle && ogDescription && ogImage ? undefined : 'Para compartilhamentos sociais, considere og:title, og:description e og:image.'),
    seoItem('twitter-card', 'Twitter/X Card', twitterCard ? 'pass' : 'info', twitterCard ? `twitter:card: ${twitterCard}` : 'twitter:card não encontrado.'),
    seoItem('structured-data', 'Dados estruturados', jsonLd > 0 ? 'pass' : 'info', jsonLd > 0 ? `${jsonLd} bloco(s) JSON-LD encontrado(s).` : 'Nenhum JSON-LD encontrado.', jsonLd ? undefined : 'Use dados estruturados apenas quando houver um tipo Schema.org realmente aplicável.'),
    seoItem('favicon', 'Favicon', favicon ? 'pass' : 'info', favicon ? `Ícone declarado: ${favicon}` : 'Nenhum rel="icon" explícito encontrado.'),
    seoItem('single-title', 'Único elemento title', titleTags.length === 1 ? 'pass' : 'warning', `${titleTags.length} elemento(s) <title> detectado(s).`, titleTags.length !== 1 ? 'Mantenha um único title por documento.' : undefined, 2),
    seoItem('single-description', 'Única meta description', descriptions.length <= 1 ? 'pass' : 'warning', `${descriptions.length} meta description detectada(s).`, descriptions.length > 1 ? 'Mantenha apenas uma meta description para evitar sinais conflitantes.' : undefined),
    seoItem('single-canonical', 'Única canonical', canonicalLinks.length <= 1 ? 'pass' : 'fail', `${canonicalLinks.length} canonical(s) detectada(s).`, canonicalLinks.length > 1 ? 'Use uma única URL canônica por documento.' : undefined, 2),
    seoItem('canonical-absolute', 'Canonical absoluta', !canonical ? 'info' : canonicalAbsolute ? 'pass' : 'warning', !canonical ? 'Sem canonical para avaliar.' : canonicalAbsolute ? 'Canonical usa URL absoluta.' : 'Canonical parece relativa.', canonical && !canonicalAbsolute ? 'Prefira URL absoluta para canonical.' : undefined),
    seoItem('canonical-origin', 'Origem da canonical', !canonical || !pageUrl ? 'info' : canonicalSameOrigin ? 'pass' : 'warning', !canonical ? 'Sem canonical para avaliar.' : canonicalSameOrigin ? 'Canonical está na mesma origem.' : 'Canonical aponta para outra origem.', canonical && !canonicalSameOrigin ? 'Confirme se a canonical cross-domain é realmente intencional.' : undefined),
    seoItem('canonical-self', 'Self-canonical', !canonical || !pageUrl ? 'info' : canonicalSelf ? 'pass' : 'info', !canonical ? 'Sem canonical para avaliar.' : canonicalSelf ? 'Canonical corresponde à URL atual normalizada.' : 'Canonical aponta para uma URL diferente da página atual.', canonical && !canonicalSelf ? 'Isso pode ser correto em páginas duplicadas; confirme a intenção.' : undefined),
    seoItem('canonical-fragment', 'Canonical sem fragmento', !canonical || !canonicalHasFragment ? 'pass' : 'warning', canonicalHasFragment ? 'Canonical contém #fragment.' : 'Canonical sem fragmento.', canonicalHasFragment ? 'Remova fragmentos de URLs canônicas.' : undefined),
    seoItem('robots-duplicates', 'Meta robots duplicada', robotsMetas.length <= 1 ? 'pass' : 'info', `${robotsMetas.length} meta robots detectada(s).`, robotsMetas.length > 1 ? 'Evite diretivas duplicadas ou conflitantes.' : undefined),
    seoItem('robots-nofollow', 'Meta nofollow', nofollow ? 'warning' : 'pass', nofollow ? `nofollow detectado em meta robots: ${robots}` : 'Nenhum nofollow global detectado.', nofollow ? 'Confirme se deseja impedir o rastreamento de todos os links da página.' : undefined),
    seoItem('title-placeholder', 'Título genérico/provisório', placeholderTitle ? 'fail' : 'pass', placeholderTitle ? `Título parece genérico: ${title}` : 'Título não parece placeholder comum.', placeholderTitle ? 'Troque por um título específico que descreva a página.' : undefined, 2),
    seoItem('h1-length', 'Comprimento do H1', !h1Text ? 'info' : h1GoodLength ? 'pass' : 'warning', h1Text ? `H1 com ${h1Text.length} caracteres.` : 'Sem H1 para avaliar.', h1Text && !h1GoodLength ? 'Mantenha o H1 claro e legível, evitando extremos de tamanho.' : undefined),
    seoItem('og-url', 'Open Graph URL', !ogUrl ? 'info' : ogUrlAbsolute ? 'pass' : 'warning', ogUrl ? `og:url: ${ogUrl}` : 'og:url não encontrado.', ogUrl && !ogUrlAbsolute ? 'Use URL HTTP(S) absoluta em og:url.' : undefined),
    seoItem('og-type', 'Open Graph type', ogType ? 'pass' : 'info', ogType ? `og:type: ${ogType}` : 'og:type não encontrado.'),
    seoItem('og-image-absolute', 'Open Graph image absoluta', !ogImage ? 'info' : ogImageAbsolute ? 'pass' : 'warning', ogImage ? `og:image: ${ogImage}` : 'og:image não encontrado.', ogImage && !ogImageAbsolute ? 'Prefira URL absoluta para imagens sociais.' : undefined),
    seoItem('twitter-complete', 'Twitter/X Card completa', twitterComplete ? 'pass' : twitterCard ? 'info' : 'info', twitterComplete ? 'Card tem título, descrição e imagem próprios ou via Open Graph.' : 'Card social pode estar incompleta.', twitterCard && !twitterComplete ? 'Adicione os campos sociais necessários ou garanta fallback Open Graph.' : undefined),
    seoItem('hreflang', 'Hreflang', alternateLinks.length ? 'pass' : 'info', alternateLinks.length ? `${alternateLinks.length} alternância(s) hreflang detectada(s).` : 'Nenhum hreflang detectado; isso é normal em sites de um único idioma.'),
    seoItem('hreflang-valid', 'Formato hreflang', hreflangInvalid === 0 && hreflangNoHref === 0 ? 'pass' : 'warning', `${hreflangInvalid} valor(es) hreflang incomum(ns) e ${hreflangNoHref} sem href.`, hreflangInvalid || hreflangNoHref ? 'Revise códigos de idioma/região e URLs de alternate.' : undefined),
    seoItem('hreflang-x-default', 'Hreflang x-default', alternateLinks.length === 0 || hasXDefault ? 'pass' : 'info', alternateLinks.length === 0 ? 'Sem hreflang para avaliar.' : hasXDefault ? 'x-default detectado.' : 'Conjunto hreflang sem x-default.', !hasXDefault && alternateLinks.length ? 'x-default é opcional, mas pode indicar a página padrão para usuários sem correspondência.' : undefined),
    seoItem('generic-links', 'Anchor text descritivo', genericLinks === 0 ? 'pass' : 'warning', `${genericLinks} link(s) com texto genérico.`, genericLinks ? 'Use textos de link que descrevam o destino.' : undefined),
    seoItem('soft-404-copy', 'Sinais de soft 404', soft404Signals ? 'warning' : 'pass', soft404Signals ? 'Título/H1 contém sinais de página 404/não encontrada.' : 'Nenhum sinal textual óbvio de soft 404.', soft404Signals ? 'Se esta é uma página inexistente, retorne status 404/410 real em vez de 200.' : undefined, 2),
    seoItem('content-depth', 'Conteúdo indexável aproximado', bodyWordCount >= 50 ? 'pass' : 'info', `${bodyWordCount} palavra(s) de texto visível aproximado.`, bodyWordCount < 50 ? 'Páginas utilitárias podem ser curtas; em páginas editoriais/comerciais, confirme se há conteúdo suficiente.' : undefined),
    seoItem('meta-keywords', 'Meta keywords legado', metaKeywords ? 'info' : 'pass', metaKeywords ? 'Meta keywords detectada (legada e normalmente desnecessária).' : 'Meta keywords não utilizada.', metaKeywords ? 'Não dependa de meta keywords para SEO moderno.' : undefined),
    seoItem('generator', 'Meta generator', metaGenerator ? 'info' : 'pass', metaGenerator ? `Generator exposto: ${metaGenerator}` : 'Meta generator não detectada.'),
    seoItem('search-input', 'Busca interna detectada', searchInput ? 'info' : 'pass', searchInput ? 'Foi detectado um campo de busca interna.' : 'Nenhum campo de busca interna detectado; isso não é requisito de SEO.')
  ];

  return {
    items,
    metadata: { title, description, canonical, language, robots, ogTitle, ogDescription, ogImage, ogUrl, ogType, twitterCard, twitterTitle, twitterDescription, twitterImage, jsonLd, favicon, hreflang: alternateLinks.map((a) => ({ lang: a.hreflang, href: a.href })) }
  };
}

function normalizedUrl(value) {
  const url = new URL(value);
  url.hash = '';
  if ((url.protocol === 'https:' && url.port === '443') || (url.protocol === 'http:' && url.port === '80')) url.port = '';
  if (url.pathname !== '/' && url.pathname.endsWith('/')) url.pathname = url.pathname.slice(0, -1);
  return url.toString();
}
function isAbsoluteHttpUrl(value) {
  try { const url = new URL(value); return ['http:', 'https:'].includes(url.protocol); } catch { return false; }
}
function seoItem(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'SEO', id, title, severity, message, recommendation, weight };
}
