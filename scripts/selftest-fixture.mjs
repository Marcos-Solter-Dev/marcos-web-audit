import http from 'node:http';
import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { auditSite } from '../src/auditor.js';
import { createHtmlReport } from '../src/reporters/html.js';
import { createMarkdownReport } from '../src/reporters/markdown.js';
import { createSarifReport } from '../src/reporters/sarif.js';

const server = http.createServer((req, res) => {
  if (req.url === '/robots.txt') return res.end('User-agent: *\nSitemap: /sitemap.xml');
  if (req.url === '/sitemap.xml') { res.setHeader('content-type', 'application/xml'); return res.end('<urlset></urlset>'); }
  if (req.url === '/.well-known/security.txt') return res.end('Contact: mailto:security@example.com');
  if (req.url === '/manifest.webmanifest') { res.setHeader('content-type', 'application/manifest+json'); return res.end(JSON.stringify({ name: 'Fixture', short_name: 'Fixture', start_url: '/', scope: '/', display: 'standalone', theme_color: '#016FF7', background_color: '#ffffff', icons: [{ src: '/192.png', sizes: '192x192', type: 'image/png' }, { src: '/512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' }] })); }
  if (req.url === '/broken') { res.statusCode = 404; return res.end('broken'); }
  res.setHeader('content-type', 'text/html; charset=utf-8');
  res.setHeader('content-security-policy', "default-src 'self'; object-src 'none'; base-uri 'self'; frame-ancestors 'none'; form-action 'self'");
  res.setHeader('x-content-type-options', 'nosniff');
  res.setHeader('referrer-policy', 'strict-origin-when-cross-origin');
  res.setHeader('permissions-policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('cache-control', 'no-cache');
  res.end(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="theme-color" content="#016FF7"><title>Marcos Web Audit Fixture</title><meta name="description" content="Página de teste local suficientemente descritiva para validar o Marcos Web Audit sem depender de serviços externos durante a revisão."><link rel="canonical" href="http://127.0.0.1/"><link rel="manifest" href="/manifest.webmanifest"><script type="application/ld+json">{"@context":"https://schema.org","@type":"WebSite","url":"/"}</script></head><body><a href="#main">Pular para conteúdo</a><main id="main"><h1>Fixture de validação</h1><p>Conteúdo local para verificar relatórios, regras, links e saída estruturada do projeto.</p><a href="/about">Sobre</a><a href="/broken">Quebrado</a></main></body></html>`);
});

await new Promise((resolveReady) => server.listen(0, '127.0.0.1', resolveReady));
try {
  const { port } = server.address();
  const report = await auditSite(`http://127.0.0.1:${port}`, { checkTls: false, maxPages: 2, maxLinks: 10, retries: 0 });
  if (report.coverage.checksExecuted < 200) throw new Error(`Esperado >=200 checks, obtido ${report.coverage.checksExecuted}`);
  const out = resolve('.review-output');
  await mkdir(out, { recursive: true });
  await writeFile(resolve(out, 'report.json'), `${JSON.stringify(report, null, 2)}\n`);
  await writeFile(resolve(out, 'report.html'), createHtmlReport(report));
  await writeFile(resolve(out, 'report.md'), createMarkdownReport(report));
  await writeFile(resolve(out, 'report.sarif'), `${JSON.stringify(createSarifReport(report), null, 2)}\n`);
  console.log(JSON.stringify({ checks: report.coverage.checksExecuted, categories: report.coverage.categories, score: report.score, links: report.links.checked }, null, 2));
} finally {
  server.close();
}
