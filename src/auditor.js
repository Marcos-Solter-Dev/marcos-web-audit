import { auditAccessibility } from './audits/accessibility.js';
import { auditBestPractices } from './audits/best-practices.js';
import { auditContent } from './audits/content.js';
import { crawlSite } from './audits/crawl.js';
import { auditDiscovery } from './audits/discovery.js';
import { auditHttp } from './audits/http.js';
import { auditLinks } from './audits/links.js';
import { auditPerformance } from './audits/performance.js';
import { auditPrivacy } from './audits/privacy.js';
import { auditPwa } from './audits/pwa.js';
import { auditSecurity } from './audits/security.js';
import { auditSeo } from './audits/seo.js';
import { auditStructuredData } from './audits/structured-data.js';
import { detectTechnologies } from './audits/technology.js';
import { auditTls } from './audits/tls.js';
import { fetchText } from './utils/request.js';
import { calculateCategoryScores, calculateScore, summarizeSeverities } from './utils/score.js';
import { normalizeUrl, sanitizeUrl } from './utils/url.js';

export async function auditSite(input, options = {}) {
  const target = normalizeUrl(input);
  const timeoutMs = numberOption(options.timeoutMs, 10_000, 1000, 60_000);
  const maxLinks = numberOption(options.maxLinks, 60, 0, 500);
  const maxPages = numberOption(options.maxPages, 8, 1, 100);
  const concurrency = numberOption(options.concurrency, 8, 1, 24);
  const retries = numberOption(options.retries, 1, 0, 3);
  const started = performance.now();

  const main = await fetchText(target, {
    timeoutMs,
    retries,
    accept: 'text/html,application/xhtml+xml;q=0.9,*/*;q=0.5',
    userAgent: options.userAgent
  });
  const response = main.response;
  const contentType = response.headers.get('content-type') ?? '';
  if (!contentType.toLowerCase().includes('text/html') && !contentType.toLowerCase().includes('application/xhtml+xml')) {
    throw new Error(`O recurso retornou "${contentType || 'tipo desconhecido'}" em vez de HTML.`);
  }

  const html = main.text;
  const finalUrl = new URL(response.url || target);
  const seo = auditSeo(html, finalUrl.toString());
  const localItems = [
    ...auditSecurity(response.headers, finalUrl, html),
    ...auditHttp(response, html),
    ...seo.items,
    ...auditAccessibility(html),
    ...auditPerformance(html, response.headers, finalUrl.toString(), { bytes: main.bytes, ttfbMs: main.elapsedMs }),
    ...auditBestPractices(html, finalUrl.toString()),
    ...auditContent(html, finalUrl.toString()),
    ...auditPrivacy(html, finalUrl.toString(), response.headers),
    ...auditStructuredData(html, finalUrl.toString())
  ];

  const [discovery, tls, linkAudit, crawl, pwa] = await Promise.all([
    options.checkDiscovery === false
      ? Promise.resolve({ items: [], robots: null, sitemap: null, securityTxt: null })
      : auditDiscovery(finalUrl, Math.min(timeoutMs, 8000)),
    options.checkTls === false
      ? Promise.resolve({ items: [], details: null })
      : auditTls(finalUrl, Math.min(timeoutMs, 8000)),
    options.checkLinks === false
      ? Promise.resolve({ discovered: 0, checked: 0, issues: [], redirects: [], averageMs: 0 })
      : auditLinks(html, finalUrl.toString(), {
          maxLinks,
          timeoutMs: Math.min(timeoutMs, 8000),
          concurrency,
          external: options.externalLinks === true,
          retries
        }),
    crawlSite(html, finalUrl.toString(), {
      maxPages,
      timeoutMs: Math.min(timeoutMs, 8000),
      concurrency: Math.min(concurrency, 6),
      retries
    }),
    options.checkPwa === false
      ? Promise.resolve({ items: [], manifest: null })
      : auditPwa(html, finalUrl.toString(), Math.min(timeoutMs, 7000))
  ]);

  const linkSeverity = options.checkLinks === false
    ? 'info'
    : linkAudit.issues.length > 0
      ? (linkAudit.issues.some((issue) => Number(issue.status ?? 0) >= 500 || issue.error) ? 'fail' : 'warning')
      : 'pass';

  const linkItems = [
    {
      category: 'Links', id: 'broken-links', title: 'Links verificados', severity: linkSeverity, weight: 3,
      message: options.checkLinks === false
        ? 'Checagem de links desativada.'
        : `${linkAudit.checked} de ${linkAudit.discovered} link(s) verificado(s); ${linkAudit.issues.length} problema(s) e ${linkAudit.redirects.length} redirecionamento(s).`,
      recommendation: linkAudit.issues.length ? 'Corrija links quebrados ou destinos indisponíveis.' : undefined
    },
    {
      category: 'Links', id: 'redirected-links', title: 'Links redirecionados', severity: linkAudit.redirects.length <= 3 ? 'pass' : 'info', weight: 1,
      message: `${linkAudit.redirects.length} link(s) exigem redirecionamento.`,
      recommendation: linkAudit.redirects.length > 3 ? 'Atualize links internos para o destino final e reduza hops desnecessários.' : undefined
    },
    {
      category: 'Links', id: 'link-latency', title: 'Latência média de links', severity: linkAudit.averageMs <= 1000 ? 'pass' : linkAudit.averageMs <= 2500 ? 'info' : 'warning', weight: 1,
      message: linkAudit.checked ? `Média aproximada: ${linkAudit.averageMs} ms.` : 'Nenhum link foi checado.',
      recommendation: linkAudit.averageMs > 2500 ? 'Revise destinos lentos, redirects e dependências externas.' : undefined
    }
  ];

  let items = [...localItems, ...tls.items, ...discovery.items, ...pwa.items, ...linkItems, ...crawl.items];
  items = applyRuleFilters(items, options);
  const categoryScores = calculateCategoryScores(items);
  const score = calculateScore(items);
  const uniqueRuleIds = new Set(items.map((item) => `${item.category}:${item.id}`));

  return {
    schemaVersion: 3,
    tool: { name: 'Marcos Web Audit', version: '3.0.0' },
    target: sanitizeUrl(target.toString()),
    finalUrl: sanitizeUrl(finalUrl.toString()),
    scannedAt: new Date().toISOString(),
    durationMs: Math.round(performance.now() - started),
    status: response.status,
    contentType,
    score,
    grade: grade(score),
    categoryScores,
    summary: summarizeSeverities(items),
    coverage: {
      checksExecuted: items.length,
      uniqueRules: uniqueRuleIds.size,
      categories: Object.keys(categoryScores).length,
      pagesRequested: maxPages,
      linksRequested: maxLinks
    },
    items,
    links: linkAudit,
    crawl,
    discovery: {
      robots: discovery.robots,
      sitemap: discovery.sitemap,
      securityTxt: discovery.securityTxt
    },
    pwa: { manifest: pwa.manifest },
    tls: tls.details,
    metadata: {
      ...seo.metadata,
      technologies: detectTechnologies(html, response.headers)
    },
    metrics: {
      htmlBytes: main.bytes,
      responseMs: main.elapsedMs,
      attempts: main.attempts
    },
    options: {
      maxLinks,
      maxPages,
      concurrency,
      retries,
      checkLinks: options.checkLinks !== false,
      checkTls: options.checkTls !== false,
      checkDiscovery: options.checkDiscovery !== false,
      checkPwa: options.checkPwa !== false,
      externalLinks: options.externalLinks === true,
      onlyCategories: listOption(options.onlyCategories),
      excludeRules: listOption(options.excludeRules)
    }
  };
}

function applyRuleFilters(items, options) {
  const only = listOption(options.onlyCategories).map((x) => x.toLowerCase());
  const excluded = new Set(listOption(options.excludeRules).map((x) => x.toLowerCase()));
  return items.filter((item) => {
    const rule = String(item.id).toLowerCase();
    const qualified = `${String(item.category).toLowerCase()}:${rule}`;
    if (excluded.has(rule) || excluded.has(qualified)) return false;
    if (only.length && !only.includes(String(item.category).toLowerCase())) return false;
    return true;
  });
}

function listOption(value) {
  if (!value) return [];
  if (Array.isArray(value)) return value.flatMap((x) => String(x).split(',')).map((x) => x.trim()).filter(Boolean);
  return String(value).split(',').map((x) => x.trim()).filter(Boolean);
}

function numberOption(value, fallback, min, max) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function grade(score) {
  if (score >= 95) return 'A+';
  if (score >= 90) return 'A';
  if (score >= 80) return 'B';
  if (score >= 70) return 'C';
  if (score >= 60) return 'D';
  return 'F';
}
