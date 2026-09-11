import { extractAnchors } from '../utils/html.js';
import { mapLimit, fetchWithTimeout } from '../utils/request.js';
import { sameOrigin, sanitizeUrl } from '../utils/url.js';

async function probe(url, timeoutMs, retries) {
  try {
    let result = await fetchWithTimeout(url, { method: 'HEAD', timeoutMs, retries });
    if ([403, 405].includes(result.response.status)) {
      result = await fetchWithTimeout(url, { method: 'GET', timeoutMs, retries });
    }
    return {
      status: result.response.status,
      finalUrl: sanitizeUrl(result.response.url || url),
      elapsedMs: result.elapsedMs
    };
  } catch (error) {
    return { error: error instanceof Error ? error.message : String(error) };
  }
}

export async function auditLinks(html, baseUrl, { maxLinks = 40, timeoutMs = 7000, concurrency = 6, external = false, retries = 0 } = {}) {
  const all = extractAnchors(html, baseUrl);
  const candidates = all
    .filter((url) => external ? true : sameOrigin(url, baseUrl))
    .slice(0, maxLinks);

  const results = await mapLimit(candidates, concurrency, async (url) => ({ url: sanitizeUrl(url), ...(await probe(url, timeoutMs, retries)) }));
  const issues = results.filter((result) => result.error || result.status >= 400);
  const redirects = results.filter((result) => result.finalUrl && result.finalUrl !== result.url && !result.error);

  return {
    discovered: all.length,
    checked: candidates.length,
    issues: issues.sort((a, b) => a.url.localeCompare(b.url)),
    redirects: redirects.sort((a, b) => a.url.localeCompare(b.url)),
    averageMs: results.length ? Math.round(results.reduce((sum, result) => sum + Number(result.elapsedMs ?? 0), 0) / results.length) : 0
  };
}
