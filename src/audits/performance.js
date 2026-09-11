import { auditImages, auditResources, findPairedTags, findTags, parseAttributes } from '../utils/html.js';

export function auditPerformance(html, headers, baseUrl, metrics = {}) {
  const bytes = Number(metrics.bytes ?? Buffer.byteLength(html, 'utf8'));
  const ttfb = Number(metrics.ttfbMs ?? 0);
  const resources = auditResources(html, baseUrl);
  const images = auditImages(html);
  const encoding = headers.get('content-encoding');
  const cacheControl = headers.get('cache-control');
  const etag = headers.get('etag');
  const lastModified = headers.get('last-modified');
  const vary = headers.get('vary') ?? '';
  const htmlSeverity = bytes <= 100_000 ? 'pass' : bytes <= 300_000 ? 'warning' : 'fail';
  const ttfbSeverity = ttfb <= 800 ? 'pass' : ttfb <= 1800 ? 'warning' : 'fail';
  const resourceSeverity = resources.total <= 60 ? 'pass' : resources.total <= 120 ? 'warning' : 'fail';
  const lazyRatio = images.total <= 2 ? 1 : images.lazy / Math.max(1, images.total);

  const scripts = findTags(html, 'script').map(parseAttributes);
  const externalScripts = scripts.filter((a) => a.src);
  const syncExternal = externalScripts.filter((a) => !Object.hasOwn(a, 'async') && !Object.hasOwn(a, 'defer') && (a.type ?? '').toLowerCase() !== 'module').length;
  const inlineJsBytes = findPairedTags(html, 'script').filter(({ attrs }) => !attrs.src).reduce((sum, x) => sum + Buffer.byteLength(x.inner, 'utf8'), 0);
  const inlineCssBytes = findPairedTags(html, 'style').reduce((sum, x) => sum + Buffer.byteLength(x.inner, 'utf8'), 0);
  const stylesheets = findTags(html, 'link').map(parseAttributes).filter((a) => (a.rel ?? '').toLowerCase().split(/\s+/).includes('stylesheet'));
  const preloads = findTags(html, 'link').map(parseAttributes).filter((a) => (a.rel ?? '').toLowerCase().split(/\s+/).includes('preload'));
  const preconnects = findTags(html, 'link').map(parseAttributes).filter((a) => (a.rel ?? '').toLowerCase().split(/\s+/).includes('preconnect'));
  const modulePreloads = findTags(html, 'link').map(parseAttributes).filter((a) => (a.rel ?? '').toLowerCase().split(/\s+/).includes('modulepreload'));
  const imgTags = findTags(html, 'img').map(parseAttributes);
  const withSrcset = imgTags.filter((a) => a.srcset).length;
  const modernImages = imgTags.filter((a) => /\.(?:webp|avif)(?:[?#]|$)/i.test(a.src ?? '')).length;
  const legacyLargeCandidates = imgTags.filter((a) => /\.(?:png|jpe?g)(?:[?#]|$)/i.test(a.src ?? '') && !a.srcset).length;
  const dataUris = (html.match(/(?:src|href)\s*=\s*["']data:/gi) ?? []).length;
  const largeDataUris = [...html.matchAll(/(?:src|href)\s*=\s*["'](data:[^"']+)/gi)].filter((m) => m[1].length > 10_000).length;
  const domNodes = (html.match(/<[a-z][^>]*>/gi) ?? []).length;
  const thirdPartyOrigins = uniqueThirdPartyOrigins(resources.resources, baseUrl);
  const duplicateResources = countDuplicate(resources.resources.map((r) => r.url).filter(Boolean));
  const firstImageLazy = (imgTags[0]?.loading ?? '').toLowerCase() === 'lazy';
  const firstImagePriority = (imgTags[0]?.fetchpriority ?? '').toLowerCase();
  const fontsPreloaded = preloads.filter((a) => (a.as ?? '').toLowerCase() === 'font').length;
  const fontsPreloadedNoCrossorigin = preloads.filter((a) => (a.as ?? '').toLowerCase() === 'font' && !Object.hasOwn(a, 'crossorigin')).length;
  const cacheMaxAge = Number(cacheControl?.match(/max-age\s*=\s*(\d+)/i)?.[1] ?? 0);
  const cssMediaPrint = stylesheets.filter((a) => (a.media ?? '').toLowerCase() === 'print').length;

  return [
    perf('ttfb', 'Tempo até os headers', ttfbSeverity, `${ttfb} ms até a resposta principal.`, ttfbSeverity === 'pass' ? undefined : 'Revise backend, cache, CDN e distância de rede. Esta métrica é apenas indicativa.', 3),
    perf('html-size', 'Tamanho do HTML', htmlSeverity, `${formatBytes(bytes)} de HTML recebido.`, htmlSeverity === 'pass' ? undefined : 'Reduza markup repetido e conteúdo inline desnecessário.', 2),
    perf('compression', 'Compressão de resposta', encoding ? 'pass' : bytes > 20_000 ? 'warning' : 'info', encoding ? `Content-Encoding: ${encoding}` : 'Nenhuma compressão foi observada na resposta principal.', encoding ? undefined : 'Ative Brotli ou gzip quando apropriado.', 2),
    perf('resources', 'Quantidade de recursos', resourceSeverity, `${resources.total} recurso(s) HTML referenciado(s): ${resources.scripts} scripts, ${resources.stylesheets} CSS, ${resources.images} imagens.`, resourceSeverity === 'pass' ? undefined : 'Reduza requisições desnecessárias e divida carregamento por prioridade.', 2),
    perf('render-blocking', 'Scripts potencialmente bloqueantes', resources.renderBlockingScripts === 0 ? 'pass' : resources.renderBlockingScripts <= 3 ? 'warning' : 'fail', `${resources.renderBlockingScripts} script(s) externo(s) sem async/defer/type=module.`, resources.renderBlockingScripts ? 'Use defer/async quando a ordem de execução permitir.' : undefined, 2),
    perf('lazy-images', 'Lazy loading de imagens', lazyRatio >= 0.5 ? 'pass' : 'info', images.total ? `${images.lazy} de ${images.total} imagem(ns) usam loading="lazy".` : 'Nenhuma imagem encontrada.', lazyRatio >= 0.5 ? undefined : 'Aplique lazy loading a imagens fora da primeira dobra.'),
    perf('image-dimensions', 'Dimensões de imagens', images.withoutDimensions === 0 ? 'pass' : 'warning', `${images.withoutDimensions} de ${images.total} imagem(ns) sem width/height explícitos.`, images.withoutDimensions ? 'Defina dimensões para reduzir layout shift.' : undefined, 2),
    perf('cache-control', 'Cache-Control', cacheControl ? 'pass' : 'info', cacheControl ? `Cache-Control: ${cacheControl}` : 'Cache-Control não encontrado na resposta principal.'),
    perf('script-count', 'Quantidade de scripts', scripts.length <= 15 ? 'pass' : scripts.length <= 30 ? 'warning' : 'fail', `${scripts.length} elemento(s) script detectado(s).`, scripts.length > 15 ? 'Remova scripts não usados, agrupe quando fizer sentido e carregue sob demanda.' : undefined, 2),
    perf('stylesheet-count', 'Quantidade de stylesheets', stylesheets.length <= 8 ? 'pass' : stylesheets.length <= 16 ? 'warning' : 'fail', `${stylesheets.length} stylesheet(s) externo(s).`, stylesheets.length > 8 ? 'Considere reduzir folhas bloqueantes e eliminar CSS não utilizado.' : undefined, 2),
    perf('sync-scripts', 'Scripts externos síncronos', syncExternal === 0 ? 'pass' : syncExternal <= 3 ? 'warning' : 'fail', `${syncExternal} script(s) externo(s) síncrono(s).`, syncExternal ? 'Use defer, async ou modules quando a execução permitir.' : undefined, 2),
    perf('inline-js-size', 'JavaScript inline', inlineJsBytes <= 20_000 ? 'pass' : inlineJsBytes <= 80_000 ? 'warning' : 'fail', `${formatBytes(inlineJsBytes)} de JavaScript inline.`, inlineJsBytes > 20_000 ? 'Mova código grande para arquivos cacheáveis e reduza JS crítico.' : undefined),
    perf('inline-css-size', 'CSS inline', inlineCssBytes <= 30_000 ? 'pass' : inlineCssBytes <= 100_000 ? 'warning' : 'fail', `${formatBytes(inlineCssBytes)} de CSS dentro de <style>.`, inlineCssBytes > 30_000 ? 'Mantenha apenas CSS crítico inline e externalize o restante.' : undefined),
    perf('srcset', 'Imagens responsivas', imgTags.length <= 2 || withSrcset >= Math.ceil(imgTags.length * 0.4) ? 'pass' : 'info', `${withSrcset} de ${imgTags.length} imagem(ns) usam srcset.`, imgTags.length > 2 && withSrcset < Math.ceil(imgTags.length * 0.4) ? 'Use srcset/sizes em imagens que precisam variar por viewport ou densidade.' : undefined),
    perf('modern-images', 'Formatos modernos de imagem', imgTags.length === 0 || modernImages > 0 || legacyLargeCandidates === 0 ? 'pass' : 'info', `${modernImages} imagem(ns) AVIF/WebP; ${legacyLargeCandidates} JPEG/PNG sem srcset detectada(s).`, modernImages === 0 && legacyLargeCandidates ? 'Considere AVIF/WebP quando houver ganho real de tamanho.' : undefined),
    perf('preload-count', 'Preloads', preloads.length <= 8 ? 'pass' : 'warning', `${preloads.length} preload(s) detectado(s).`, preloads.length > 8 ? 'Preload em excesso compete por largura de banda; priorize apenas recursos realmente críticos.' : undefined),
    perf('preconnect-count', 'Preconnects', preconnects.length <= 6 ? 'pass' : 'info', `${preconnects.length} preconnect(s) detectado(s).`, preconnects.length > 6 ? 'Muitos preconnects podem desperdiçar conexões; mantenha apenas origens críticas.' : undefined),
    perf('modulepreload', 'Modulepreload', modulePreloads.length ? 'pass' : 'info', `${modulePreloads.length} modulepreload(s) detectado(s).`),
    perf('data-uri', 'Data URIs', largeDataUris === 0 ? 'pass' : 'warning', `${dataUris} data URI(s), sendo ${largeDataUris} acima de 10 KB.`, largeDataUris ? 'Evite embutir recursos grandes em HTML/CSS quando poderiam ser cacheados separadamente.' : undefined),
    perf('dom-size', 'Tamanho aproximado do DOM', domNodes <= 800 ? 'pass' : domNodes <= 1500 ? 'warning' : 'fail', `${domNodes} elemento(s) HTML aproximado(s).`, domNodes > 800 ? 'Simplifique estruturas muito profundas/repetidas e renderize conteúdo sob demanda quando apropriado.' : undefined, 2),
    perf('third-party-origins', 'Origens de terceiros', thirdPartyOrigins.length <= 6 ? 'pass' : thirdPartyOrigins.length <= 12 ? 'info' : 'warning', `${thirdPartyOrigins.length} origem(ns) externa(s) para scripts/CSS/imagens.`, thirdPartyOrigins.length > 12 ? 'Reduza dependências de terceiros para diminuir DNS, conexão e risco de variabilidade.' : undefined),
    perf('duplicate-resources', 'Recursos duplicados', duplicateResources === 0 ? 'pass' : 'warning', `${duplicateResources} URL(s) de recurso repetida(s).`, duplicateResources ? 'Remova inclusões duplicadas de scripts, CSS ou imagens.' : undefined),
    perf('hero-lazy', 'Primeira imagem com lazy loading', firstImageLazy ? 'info' : 'pass', firstImageLazy ? 'A primeira imagem do documento usa loading="lazy".' : 'A primeira imagem não está marcada como lazy.', firstImageLazy ? 'Se essa imagem estiver acima da dobra/LCP, remova lazy para não atrasar a renderização.' : undefined),
    perf('hero-priority', 'Prioridade da primeira imagem', firstImagePriority === 'high' ? 'pass' : 'info', firstImagePriority ? `fetchpriority da primeira imagem: ${firstImagePriority}` : 'Primeira imagem sem fetchpriority explícito.', firstImagePriority === 'high' ? undefined : 'Use fetchpriority="high" apenas se essa imagem for realmente candidata a LCP.'),
    perf('font-preload-crossorigin', 'Fontes preload com crossorigin', fontsPreloadedNoCrossorigin === 0 ? 'pass' : 'warning', `${fontsPreloaded} fonte(s) em preload; ${fontsPreloadedNoCrossorigin} sem crossorigin.`, fontsPreloadedNoCrossorigin ? 'Preloads de fontes normalmente precisam de crossorigin compatível para evitar download duplicado.' : undefined),
    perf('cache-validator', 'Validação de cache do HTML', etag || lastModified || /no-store/i.test(cacheControl ?? '') ? 'pass' : 'info', etag || lastModified ? 'ETag/Last-Modified presente.' : /no-store/i.test(cacheControl ?? '') ? 'Resposta usa no-store.' : 'Sem ETag/Last-Modified observado.'),
    perf('cache-max-age', 'max-age do HTML', cacheMaxAge <= 3600 ? 'pass' : 'info', cacheControl ? `max-age aproximado: ${cacheMaxAge}s.` : 'Sem Cache-Control para avaliar max-age.', cacheMaxAge > 3600 ? 'HTML com cache longo pode exigir estratégia clara de invalidação.' : undefined),
    perf('vary-encoding', 'Vary e compressão', !encoding || /accept-encoding/i.test(vary) ? 'pass' : 'info', encoding ? `Content-Encoding: ${encoding}; Vary: ${vary || 'ausente'}.` : 'Sem compressão detectada para avaliar Vary.', encoding && !/accept-encoding/i.test(vary) ? 'Em caches intermediários, confirme se a variante por Accept-Encoding é tratada corretamente.' : undefined),
    perf('print-css', 'CSS de impressão', cssMediaPrint ? 'pass' : 'info', `${cssMediaPrint} stylesheet(s) media="print" detectado(s).`, undefined)
  ];
}

function uniqueThirdPartyOrigins(resourceList, baseUrl) {
  const base = new URL(baseUrl).origin;
  const set = new Set();
  for (const resource of resourceList) {
    try {
      const origin = new URL(resource.url).origin;
      if (origin !== base) set.add(origin);
    } catch { /* ignore */ }
  }
  return [...set];
}

function countDuplicate(values) {
  const counts = new Map();
  for (const value of values) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.values()].filter((count) => count > 1).length;
}

function perf(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'Performance', id, title, severity, message, recommendation, weight };
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}
