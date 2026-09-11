import test from 'node:test';
import assert from 'node:assert/strict';
import { auditSecurity } from '../src/audits/security.js';

test('segurança reconhece headers fortes', () => {
  const headers = new Headers({
    'content-security-policy': "default-src 'self'; frame-ancestors 'none'",
    'strict-transport-security': 'max-age=31536000; includeSubDomains',
    'x-content-type-options': 'nosniff',
    'referrer-policy': 'strict-origin-when-cross-origin',
    'permissions-policy': 'camera=()'
  });
  const items = auditSecurity(headers, new URL('https://example.com'), '<html></html>');
  assert.equal(items.find((x) => x.id === 'https').severity, 'pass');
  assert.equal(items.find((x) => x.id === 'csp').severity, 'pass');
  assert.equal(items.find((x) => x.id === 'clickjacking').severity, 'pass');
});

test('segurança falha em mixed content e formulário HTTP', () => {
  const headers = new Headers();
  const html = '<script src="http://cdn.example/x.js"></script><form action="http://example.com/send"></form>';
  const items = auditSecurity(headers, new URL('https://example.com'), html);
  assert.equal(items.find((x) => x.id === 'mixed-content').severity, 'fail');
  assert.equal(items.find((x) => x.id === 'insecure-forms').severity, 'fail');
});
