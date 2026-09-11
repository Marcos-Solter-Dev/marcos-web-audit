import test from 'node:test';
import assert from 'node:assert/strict';
import { auditContent } from '../src/audits/content.js';
import { auditHttp } from '../src/audits/http.js';
import { auditPrivacy } from '../src/audits/privacy.js';
import { auditPwa } from '../src/audits/pwa.js';
import { auditStructuredData } from '../src/audits/structured-data.js';
import { createSarifReport } from '../src/reporters/sarif.js';

test('conteúdo detecta ids duplicados e lorem ipsum', () => {
  const items = auditContent('<html><body><h1 id="x">Lorem ipsum</h1><p id="x">Lorem ipsum dolor sit amet</p></body></html>', 'https://example.com/');
  assert.equal(items.find((x) => x.id === 'content-duplicate-ids').severity, 'fail');
  assert.equal(items.find((x) => x.id === 'content-lorem-ipsum').severity, 'fail');
});

test('HTTP detecta noindex no X-Robots-Tag', () => {
  const response = new Response('<html></html>', { status: 200, headers: { 'content-type': 'text/html; charset=utf-8', 'x-robots-tag': 'noindex' } });
  const items = auditHttp(response, '<html></html>');
  assert.equal(items.find((x) => x.id === 'http-x-robots-tag').severity, 'warning');
});

test('privacidade detecta formulário externo e tracker', () => {
  const html = '<form action="https://forms.example.net/x"></form><script src="https://www.googletagmanager.com/gtm.js"></script>';
  const items = auditPrivacy(html, 'https://example.com/', new Headers());
  assert.equal(items.find((x) => x.id === 'privacy-third-party-forms').severity, 'warning');
  assert.match(items.find((x) => x.id === 'privacy-tracker-signals').message, /Google Tag Manager/);
});

test('dados estruturados detectam JSON-LD inválido', () => {
  const items = auditStructuredData('<script type="application/ld+json">{oops}</script>', 'https://example.com/');
  assert.equal(items.find((x) => x.id === 'structured-valid-json').severity, 'fail');
});

test('dados estruturados respeitam @context herdado por @graph', () => {
  const html = '<script type="application/ld+json">{"@context":"https://schema.org","@graph":[{"@type":"WebSite","url":"https://example.com/"}]}</script><meta property="og:title" content="X">';
  const items = auditStructuredData(html, 'https://example.com/');
  assert.equal(items.find((x) => x.id === 'structured-context').severity, 'pass');
  assert.equal(items.find((x) => x.id === 'structured-rdfa').severity, 'pass');
});

test('PWA sem manifest permanece informativa e não falha', async () => {
  const result = await auditPwa('<html><head><meta name="theme-color" content="#000"></head></html>', 'https://example.com/', 1000);
  assert.equal(result.items.find((x) => x.id === 'pwa-manifest-link').severity, 'info');
  assert.equal(result.manifest, null);
});

test('SARIF inclui warnings e fails', () => {
  const report = {
    tool: { name: 'Marcos Web Audit', version: '3.0.0' }, finalUrl: 'https://example.com/', score: 80, grade: 'B',
    coverage: { checksExecuted: 2 },
    items: [
      { category: 'SEO', id: 'x', title: 'X', severity: 'warning', message: 'aviso' },
      { category: 'Segurança', id: 'y', title: 'Y', severity: 'pass', message: 'ok' }
    ]
  };
  const sarif = createSarifReport(report);
  assert.equal(sarif.runs[0].results.length, 1);
  assert.equal(sarif.runs[0].results[0].level, 'warning');
});
