import test from 'node:test';
import assert from 'node:assert/strict';
import {
  auditHeadings,
  auditImages,
  auditInteractiveElements,
  auditResources,
  extractAnchors,
  findCharset,
  findHtmlLang,
  findLinkHref,
  findMetaContent,
  hasDoctype,
  parseAttributes
} from '../src/utils/html.js';

test('parser encontra metadados comuns', () => {
  const html = `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="description" content="Descrição"><link rel="canonical" href="https://example.com/"></head></html>`;
  assert.equal(findHtmlLang(html), 'pt-BR');
  assert.equal(findMetaContent(html, 'description'), 'Descrição');
  assert.equal(findLinkHref(html, 'canonical'), 'https://example.com/');
  assert.equal(findCharset(html), 'utf-8');
  assert.equal(hasDoctype(html), true);
});

test('parser suporta atributos booleanos', () => {
  const attrs = parseAttributes('<script src="x.js" defer></script>');
  assert.equal(attrs.src, 'x.js');
  assert.equal(Object.hasOwn(attrs, 'defer'), true);
});

test('links relativos são normalizados e fragmentos removidos', () => {
  const html = `<a href="/sobre#time">Sobre</a><a href="mailto:x@y.com">Email</a>`;
  assert.deepEqual(extractAnchors(html, 'https://example.com/'), ['https://example.com/sobre']);
});

test('auditoria de imagens mede alt, dimensões e lazy', () => {
  const stats = auditImages('<img src="a" alt="x" width="10" height="10" loading="lazy"><img src="b">');
  assert.deepEqual(stats, { total: 2, withoutAlt: 1, withoutDimensions: 1, lazy: 1 });
});

test('auditoria de headings detecta salto', () => {
  const result = auditHeadings('<h1>A</h1><h3>B</h3>');
  assert.equal(result.skippedLevels, 1);
});

test('controles interativos detectam campo sem label e link _blank inseguro', () => {
  const html = `<input id="email"><a href="/x" target="_blank">X</a><button aria-label="Fechar"></button>`;
  const result = auditInteractiveElements(html);
  assert.equal(result.unlabeledControls, 1);
  assert.equal(result.unsafeBlankLinks, 1);
  assert.equal(result.emptyButtons, 0);
});

test('recursos detectam script bloqueante e conteúdo misto', () => {
  const result = auditResources('<script src="http://cdn.example/x.js"></script>', 'https://example.com');
  assert.equal(result.renderBlockingScripts, 1);
  assert.equal(result.mixedContent, 1);
});
