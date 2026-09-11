import test from 'node:test';
import assert from 'node:assert/strict';
import { auditAccessibility } from '../src/audits/accessibility.js';
import { auditBestPractices } from '../src/audits/best-practices.js';
import { auditPerformance } from '../src/audits/performance.js';

test('acessibilidade encontra input sem label', () => {
  const items = auditAccessibility('<html lang="pt-BR"><body><h1>X</h1><input id="x"></body></html>');
  assert.equal(items.find((x) => x.id === 'form-labels').severity, 'fail');
});

test('boas práticas encontra target blank sem noopener', () => {
  const items = auditBestPractices('<!doctype html><meta charset="utf-8"><a target="_blank" href="/x">x</a>', 'https://example.com');
  assert.equal(items.find((x) => x.id === 'target-blank').severity, 'warning');
});

test('performance classifica HTML grande', () => {
  const html = `<html>${'x'.repeat(310000)}</html>`;
  const items = auditPerformance(html, new Headers(), 'https://example.com', { bytes: 310000, ttfbMs: 100 });
  assert.equal(items.find((x) => x.id === 'html-size').severity, 'fail');
  assert.equal(items.find((x) => x.id === 'ttfb').severity, 'pass');
});
