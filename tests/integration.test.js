import test from 'node:test';
import assert from 'node:assert/strict';
import http from 'node:http';
import { auditSite } from '../src/auditor.js';

function fixtureServer() {
  return http.createServer((req, res) => {
    if (req.url === '/robots.txt') return res.end('User-agent: *\nSitemap: /sitemap.xml');
    if (req.url === '/sitemap.xml') { res.setHeader('content-type', 'application/xml'); return res.end('<urlset></urlset>'); }
    if (req.url === '/.well-known/security.txt') return res.end('Contact: mailto:security@example.com');
    if (req.url === '/broken') { res.statusCode = 404; return res.end('no'); }
    res.setHeader('content-type', 'text/html; charset=utf-8');
    res.setHeader('content-security-policy', "default-src 'self'; frame-ancestors 'none'");
    res.setHeader('x-content-type-options', 'nosniff');
    res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
    res.setHeader('permissions-policy', 'camera=()');
    res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Página de teste Marcos Web Audit</title><meta name="description" content="Uma descrição suficientemente longa para validar a auditoria automatizada do projeto Marcos Web Audit durante os testes locais sem depender da internet."><meta name="viewport" content="width=device-width, initial-scale=1"><link rel="canonical" href="http://127.0.0.1/"></head><body><h1>Teste</h1><a href="/about">Sobre</a><a href="/broken">Broken</a></body></html>`);
  });
}

test('auditoria completa funciona contra servidor local', async (t) => {
  const server = fixtureServer();
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  t.after(() => server.close());
  const { port } = server.address();
  const report = await auditSite(`http://127.0.0.1:${port}`, { checkTls: false, maxPages: 2, maxLinks: 10, retries: 0 });
  assert.equal(report.status, 200);
  assert.equal(report.tool.version, '3.0.0');
  assert.ok(report.items.length >= 150);
  assert.ok(report.coverage.checksExecuted >= 150);
  assert.ok(report.coverage.categories >= 10);
  assert.ok(report.links.checked >= 2);
  assert.equal(report.links.issues.some((x) => x.status === 404), true);
  assert.equal(report.crawl.pages.length, 1);
  assert.ok(report.categoryScores.SEO >= 0);
  const filtered = await auditSite(`http://127.0.0.1:${port}`, { checkTls: false, maxPages: 1, maxLinks: 0, retries: 0, onlyCategories: 'SEO', excludeRules: 'generator' });
  assert.deepEqual(new Set(filtered.items.map((x) => x.category)), new Set(['SEO']));
  assert.equal(filtered.items.some((x) => x.id === 'generator'), false);
});
