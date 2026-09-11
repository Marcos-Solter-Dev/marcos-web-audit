import test from 'node:test';
import assert from 'node:assert/strict';
import { createBadge } from '../src/reporters/badge.js';
import { createHtmlReport } from '../src/reporters/html.js';
import { createMarkdownReport } from '../src/reporters/markdown.js';
import { compareReports } from '../src/utils/compare.js';

const report = {
  tool: { version: '2.0.0' }, finalUrl: 'https://example.com/', score: 91, grade: 'A', status: 200,
  durationMs: 100, scannedAt: '2026-01-01T00:00:00.000Z', summary: { pass: 1, warning: 0, fail: 0, info: 0 },
  categoryScores: { SEO: 91 }, items: [{ category: 'SEO', id: 'title', title: 'Título', severity: 'pass', message: 'OK' }],
  links: { checked: 1, issues: [] }, crawl: { pages: [] }, metadata: { title: 'x', description: 'y', canonical: 'https://example.com', technologies: [] }, metrics: { htmlBytes: 1000 }, tls: { protocol: 'TLSv1.3' }
};

test('reporters geram HTML e Markdown', () => {
  assert.match(createHtmlReport(report), /Marcos Web Audit/);
  assert.match(createMarkdownReport(report), /91\/100/);
});

test('badge usa score', () => {
  assert.equal(createBadge(report).message, '91/100');
});

test('comparação encontra delta e problemas corrigidos', () => {
  const previous = { score: 70, categoryScores: { SEO: 70 }, items: [{ category: 'SEO', id: 'title', severity: 'fail' }] };
  const diff = compareReports(previous, report);
  assert.equal(diff.scoreDelta, 21);
  assert.deepEqual(diff.fixedIssues, ['SEO:title']);
});
