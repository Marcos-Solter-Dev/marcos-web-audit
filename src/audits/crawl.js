import { auditAccessibility } from './accessibility.js';
import { auditSeo } from './seo.js';
import { extractAnchors } from '../utils/html.js';
import { mapLimit, fetchText } from '../utils/request.js';
import { calculateScore } from '../utils/score.js';
import { sameOrigin, sanitizeUrl } from '../utils/url.js';

export async function crawlSite(homeHtml, homeUrl, { maxPages = 1, timeoutMs = 7000, concurrency = 3, retries = 0 } = {}) {
  if (maxPages <= 1) return { pages: [], items: [] };

  const candidates = extractAnchors(homeHtml, homeUrl)
    .filter((url) => sameOrigin(url, homeUrl))
    .filter((url) => isLikelyHtmlPage(url))
    .slice(0, Math.max(0, maxPages - 1));

  const pages = (await mapLimit(candidates, concurrency, async (url) => {
    try {
      const result = await fetchText(url, { timeoutMs, retries, accept: 'text/html,*/*;q=0.8' });
      const contentType = result.response.headers.get('content-type') ?? '';
      if (!contentType.toLowerCase().includes('text/html')) {
        return { url: sanitizeUrl(url), status: result.response.status, skipped: true, reason: `Content-Type ${contentType || 'desconhecido'}` };
      }
      const seo = auditSeo(result.text, result.response.url || url);
      const a11y = auditAccessibility(result.text);
      const pageItems = [...seo.items, ...a11y];
      return {
        url: sanitizeUrl(result.response.url || url),
        status: result.response.status,
        score: calculateScore(pageItems),
        title: seo.metadata.title,
        description: seo.metadata.description,
        issues: pageItems.filter((item) => ['warning', 'fail'].includes(item.severity)).map(({ category, id, title, severity, message }) => ({ category, id, title, severity, message }))
      };
    } catch (error) {
      return { url: sanitizeUrl(url), error: error instanceof Error ? error.message : String(error) };
    }
  })).filter(Boolean);

  const failed = pages.filter((page) => page.error || Number(page.status ?? 0) >= 400).length;
  const lowScore = pages.filter((page) => Number.isFinite(page.score) && page.score < 70).length;
  const duplicateTitles = duplicateValues(pages.map((page) => page.title));
  const duplicateDescriptions = duplicateValues(pages.map((page) => page.description));

  const items = [
    crawlItem('pages', 'Páginas internas rastreadas', failed === 0 ? 'pass' : 'warning', `${pages.length} página(s) interna(s) analisada(s); ${failed} falha(s) de carregamento.`, failed ? 'Revise páginas internas que falharam durante o crawl.' : undefined, 2),
    crawlItem('low-score', 'Qualidade das páginas internas', lowScore === 0 ? 'pass' : 'warning', `${lowScore} página(s) interna(s) ficaram abaixo de 70 pontos em SEO + acessibilidade.`, lowScore ? 'Abra a seção Crawl do relatório e priorize as páginas com menor score.' : undefined, 2),
    crawlItem('duplicate-title', 'Títulos duplicados', duplicateTitles.length === 0 ? 'pass' : 'warning', duplicateTitles.length ? `${duplicateTitles.length} título(s) duplicado(s) entre páginas rastreadas.` : 'Nenhum título duplicado detectado no conjunto rastreado.', duplicateTitles.length ? 'Use títulos específicos para cada página.' : undefined, 2),
    crawlItem('duplicate-description', 'Descriptions duplicadas', duplicateDescriptions.length === 0 ? 'pass' : 'info', duplicateDescriptions.length ? `${duplicateDescriptions.length} description(s) duplicada(s).` : 'Nenhuma meta description duplicada detectada.')
  ];

  return { pages, items, duplicateTitles, duplicateDescriptions };
}

function duplicateValues(values) {
  const counts = new Map();
  for (const value of values.filter(Boolean)) counts.set(value, (counts.get(value) ?? 0) + 1);
  return [...counts.entries()].filter(([, count]) => count > 1).map(([value, count]) => ({ value, count }));
}

function isLikelyHtmlPage(value) {
  try {
    const pathname = new URL(value).pathname.toLowerCase();
    return !/\.(?:jpg|jpeg|png|gif|webp|svg|pdf|zip|rar|7z|mp4|mp3|css|js|json|xml|txt|ico|woff2?|ttf|eot)$/.test(pathname);
  } catch {
    return false;
  }
}

function crawlItem(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'Crawl', id, title, severity, message, recommendation, weight };
}
