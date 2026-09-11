import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSeo } from '../src/audits/seo.js';

test('SEO reconhece página bem estruturada', () => {
  const html = `<!doctype html><html lang="pt-BR"><head>
    <title>Marcos Dev — Desenvolvimento Web Profissional</title>
    <meta name="description" content="Desenvolvimento web moderno, seguro e profissional para projetos que precisam de desempenho, clareza e uma ótima experiência para usuários.">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta property="og:title" content="Marcos Dev"><meta property="og:description" content="Projetos web"><meta property="og:image" content="/og.png">
    <link rel="canonical" href="https://example.com/"><link rel="icon" href="/favicon.ico">
    <script type="application/ld+json">{"@context":"https://schema.org"}</script>
  </head><body><h1>Marcos Dev</h1></body></html>`;
  const result = auditSeo(html, 'https://example.com/');
  assert.equal(result.items.find((x) => x.id === 'h1').severity, 'pass');
  assert.equal(result.items.find((x) => x.id === 'open-graph').severity, 'pass');
  assert.equal(result.items.find((x) => x.id === 'structured-data').severity, 'pass');
});

test('SEO alerta para noindex', () => {
  const result = auditSeo('<html><head><meta name="robots" content="noindex"></head><body></body></html>');
  assert.equal(result.items.find((x) => x.id === 'robots-meta').severity, 'warning');
});
