import { auditInteractiveElements, auditResources, countInlineEventHandlers, findCharset, findPairedTags, findTags, hasDoctype, parseAttributes } from '../utils/html.js';

export function auditBestPractices(html, baseUrl) {
  const resources = auditResources(html, baseUrl);
  const interactive = auditInteractiveElements(html);
  const doctype = hasDoctype(html);
  const charset = findCharset(html);
  const inlineHandlers = countInlineEventHandlers(html);
  const comments = sensitiveComments(html);
  const protocolRelative = (html.match(/(?:src|href)\s*=\s*["']\/\//gi) ?? []).length;
  const javascriptUrls = (html.match(/(?:href|src|action)\s*=\s*["']\s*javascript:/gi) ?? []).length;
  const emptyHref = findTags(html, 'a').map(parseAttributes).filter((a) => Object.hasOwn(a, 'href') && !String(a.href).trim()).length;
  const metaRefresh = findTags(html, 'meta').map(parseAttributes).filter((a) => (a['http-equiv'] ?? '').toLowerCase() === 'refresh').length;
  const deprecatedTags = (html.match(/<(?:center|font|big|strike|tt|acronym|applet|basefont)\b/gi) ?? []).length;
  const charsetEarly = charset ? /<meta\b[^>]*(?:charset\s*=|http-equiv=["']?content-type)/i.test(html.slice(0, 1024)) : false;
  const charsets = findTags(html, 'meta').map(parseAttributes).filter((a) => a.charset || ((a['http-equiv'] ?? '').toLowerCase() === 'content-type' && /charset=/i.test(a.content ?? ''))).length;
  const forms = findTags(html, 'form').map(parseAttributes);
  const formsWithoutMethod = forms.filter((a) => !a.method).length;
  const passwordGetForms = findPairedTags(html, 'form').filter(({ attrs, inner }) => (attrs.method ?? 'get').toLowerCase() === 'get' && /<input\b[^>]*type\s*=\s*["']?password/i.test(inner)).length;
  const baseTags = findTags(html, 'base').map(parseAttributes);
  const multipleBase = baseTags.length > 1;
  const externalBase = baseTags.some((a) => {
    try { return a.href && new URL(a.href, baseUrl).origin !== new URL(baseUrl).origin; } catch { return false; }
  });
  const inlineStyles = (html.match(/\sstyle\s*=/gi) ?? []).length;
  const styleTags = findPairedTags(html, 'style');
  const cssImports = styleTags.reduce((sum, tag) => sum + (tag.inner.match(/@import\b/gi) ?? []).length, 0);
  const noscript = /<noscript\b/i.test(html);
  const scripts = findTags(html, 'script').map(parseAttributes);
  const moduleScripts = scripts.filter((a) => (a.type ?? '').toLowerCase() === 'module').length;
  const nomoduleScripts = scripts.filter((a) => Object.hasOwn(a, 'nomodule')).length;
  const obsoleteXua = findTags(html, 'meta').map(parseAttributes).filter((a) => (a['http-equiv'] ?? '').toLowerCase() === 'x-ua-compatible').length;

  return [
    bp('doctype', 'HTML5 doctype', doctype ? 'pass' : 'warning', doctype ? '<!doctype html> encontrado.' : 'Doctype HTML5 não encontrado.', doctype ? undefined : 'Adicione <!doctype html> no início do documento.', 2),
    bp('charset', 'Charset explícito', charset ? 'pass' : 'warning', charset ? `Charset declarado: ${charset}` : 'Charset não encontrado em <meta>.', charset ? undefined : 'Declare <meta charset="utf-8"> no início do <head>.', 1),
    bp('sri', 'Subresource Integrity', resources.externalWithoutSri === 0 ? 'pass' : 'info', `${resources.externalWithoutSri} script(s)/stylesheet(s) de outra origem sem integrity.`, resources.externalWithoutSri ? 'Considere SRI em recursos CDN estáticos quando houver hash estável.' : undefined),
    bp('target-blank', 'Links target="_blank"', interactive.unsafeBlankLinks === 0 ? 'pass' : 'warning', `${interactive.unsafeBlankLinks} link(s) _blank sem noopener/noreferrer detectado(s).`, interactive.unsafeBlankLinks ? 'Use rel="noopener" (ou noreferrer) conforme necessário.' : undefined, 2),
    bp('inline-events', 'Handlers inline', inlineHandlers === 0 ? 'pass' : 'info', `${inlineHandlers} atributo(s) de evento inline detectado(s).`, inlineHandlers ? 'Prefira addEventListener e uma CSP mais restritiva em aplicações modernas.' : undefined),
    bp('html-comments', 'Comentários potencialmente sensíveis', comments === 0 ? 'pass' : 'warning', `${comments} comentário(s) com palavras sensíveis como TODO/password/secret/token.`, comments ? 'Revise comentários publicados para evitar pistas ou segredos acidentais.' : undefined, 2),
    bp('charset-early', 'Charset no início do documento', !charset ? 'info' : charsetEarly ? 'pass' : 'warning', !charset ? 'Sem charset para avaliar posição.' : charsetEarly ? 'Declaração de charset aparece nos primeiros 1024 bytes.' : 'Charset foi declarado depois dos primeiros 1024 bytes.', charset && !charsetEarly ? 'Mova <meta charset="utf-8"> para o começo do <head>.' : undefined),
    bp('duplicate-charset', 'Declarações de charset duplicadas', charsets <= 1 ? 'pass' : 'warning', `${charsets} declaração(ões) de charset detectada(s).`, charsets > 1 ? 'Mantenha uma única declaração de charset consistente.' : undefined),
    bp('protocol-relative', 'URLs protocol-relative', protocolRelative === 0 ? 'pass' : 'warning', `${protocolRelative} URL(s) começando com // detectada(s).`, protocolRelative ? 'Prefira URLs HTTPS explícitas ou relativas ao mesmo site.' : undefined),
    bp('javascript-urls', 'URLs javascript:', javascriptUrls === 0 ? 'pass' : 'warning', `${javascriptUrls} URL(s) javascript: detectada(s).`, javascriptUrls ? 'Prefira botões/handlers apropriados em vez de javascript: em href/src/action.' : undefined, 2),
    bp('empty-href', 'Links com href vazio', emptyHref === 0 ? 'pass' : 'info', `${emptyHref} link(s) com href vazio.`, emptyHref ? 'Use destino real, botão, ou remova o elemento interativo se não houver navegação.' : undefined),
    bp('meta-refresh', 'Meta refresh', metaRefresh === 0 ? 'pass' : 'warning', `${metaRefresh} meta refresh detectado(s).`, metaRefresh ? 'Prefira redirecionamentos HTTP 3xx e evite refresh automático para navegação.' : undefined, 2),
    bp('deprecated-tags', 'Elementos HTML obsoletos', deprecatedTags === 0 ? 'pass' : 'warning', `${deprecatedTags} elemento(s) HTML obsoleto(s) detectado(s).`, deprecatedTags ? 'Substitua tags obsoletas por HTML semântico e CSS.' : undefined),
    bp('form-method', 'Método de formulários explícito', formsWithoutMethod === 0 ? 'pass' : forms.length ? 'info' : 'pass', `${formsWithoutMethod} de ${forms.length} formulário(s) sem method explícito.`, formsWithoutMethod ? 'Declare GET ou POST explicitamente quando isso melhorar clareza e revisão.' : undefined),
    bp('password-get', 'Senha em formulário GET', passwordGetForms === 0 ? 'pass' : 'fail', `${passwordGetForms} formulário(s) com senha usam GET/ausência de method.`, passwordGetForms ? 'Credenciais não devem ir na URL; use POST sobre HTTPS.' : undefined, 3, passwordGetForms > 0),
    bp('base-tag', 'Uso de <base>', !multipleBase && !externalBase ? 'pass' : 'warning', multipleBase ? 'Mais de um <base> foi encontrado.' : externalBase ? 'O <base href> aponta para outra origem.' : baseTags.length ? '<base> configurado sem problema óbvio.' : 'Nenhum <base> utilizado.', multipleBase || externalBase ? 'Revise <base>; ele altera a resolução de URLs de todo o documento.' : undefined),
    bp('inline-style', 'Estilos inline', inlineStyles <= 20 ? 'pass' : inlineStyles <= 80 ? 'info' : 'warning', `${inlineStyles} atributo(s) style inline.`, inlineStyles > 80 ? 'Muitos estilos inline dificultam manutenção e CSP; prefira classes quando possível.' : undefined),
    bp('css-import', '@import em CSS inline', cssImports === 0 ? 'pass' : 'info', `${cssImports} regra(s) @import em <style>.`, cssImports ? 'Prefira <link rel="stylesheet"> ou bundling para controlar melhor o carregamento.' : undefined),
    bp('noscript', 'Fallback noscript', scripts.length < 3 || noscript ? 'pass' : 'info', noscript ? '<noscript> detectado.' : `${scripts.length} scripts e nenhum <noscript> detectado.`, scripts.length >= 3 && !noscript ? 'Se funcionalidades essenciais dependem de JS, considere uma mensagem/fallback apropriado.' : undefined),
    bp('modern-js', 'Scripts module/nomodule', moduleScripts || nomoduleScripts ? 'pass' : 'info', `${moduleScripts} module e ${nomoduleScripts} nomodule detectado(s).`, undefined),
    bp('x-ua-compatible', 'X-UA-Compatible legado', obsoleteXua === 0 ? 'pass' : 'info', `${obsoleteXua} meta X-UA-Compatible detectado(s).`, obsoleteXua ? 'Esse meta é legado para Internet Explorer e normalmente pode ser removido.' : undefined)
  ];
}

function sensitiveComments(html) {
  const comments = [...html.matchAll(/<!--([\s\S]*?)-->/g)].map((match) => match[1]);
  return comments.filter((text) => /password|passwd|secret|api[_ -]?key|token|TODO|FIXME/i.test(text)).length;
}

function bp(id, title, severity, message, recommendation, weight = 1, critical = false) {
  return { category: 'Boas práticas', id, title, severity, message, recommendation, weight, critical };
}
