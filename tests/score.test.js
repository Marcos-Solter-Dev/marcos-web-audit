import test from 'node:test';
import assert from 'node:assert/strict';
import { calculateCategoryScores, calculateScore, summarizeSeverities } from '../src/utils/score.js';

test('score perfeito com itens aprovados e informativos', () => {
  const items = [{ category: 'SEO', severity: 'pass' }, { category: 'SEO', severity: 'info' }];
  assert.equal(calculateScore(items), 100);
  assert.deepEqual(calculateCategoryScores(items), { SEO: 100 });
});

test('score ponderado penaliza warning menos que fail', () => {
  const warning = calculateScore([{ category: 'SEO', severity: 'warning' }]);
  const fail = calculateScore([{ category: 'SEO', severity: 'fail' }]);
  assert.ok(warning > fail);
  assert.equal(fail, 0);
});

test('resumo conta severidades', () => {
  assert.deepEqual(summarizeSeverities([{ severity: 'pass' }, { severity: 'fail' }, { severity: 'warning' }]), { pass: 1, info: 0, warning: 1, fail: 1 });
});

test('falha crítica limita o score geral', () => {
  const items = [
    { category: 'Segurança', severity: 'fail', weight: 1, critical: true },
    ...Array.from({ length: 20 }, () => ({ category: 'SEO', severity: 'pass' }))
  ];
  assert.ok(calculateScore(items) <= 79);
});
