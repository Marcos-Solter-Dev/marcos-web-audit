const severityPenalty = {
  pass: 0,
  info: 0,
  warning: 0.35,
  fail: 1
};

const categoryImportance = {
  'Segurança': 0.24,
  'SEO': 0.19,
  'Acessibilidade': 0.14,
  'Performance': 0.14,
  'Boas práticas': 0.11,
  'Links': 0.07,
  'Descoberta': 0.06,
  'Crawl': 0.05,
  'HTTP': 0.08,
  'PWA': 0.04,
  'Privacidade': 0.06,
  'Conteúdo': 0.05,
  'Dados estruturados': 0.04
};

export function calculateCategoryScores(items) {
  const grouped = new Map();
  for (const item of items) {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category).push(item);
  }

  const scores = {};
  for (const [category, categoryItems] of grouped.entries()) {
    const totalWeight = categoryItems.reduce((sum, item) => sum + normalizeWeight(item.weight), 0);
    const penalty = categoryItems.reduce(
      (sum, item) => sum + normalizeWeight(item.weight) * (severityPenalty[item.severity] ?? 0),
      0
    );
    scores[category] = totalWeight === 0 ? 100 : clamp(Math.round(100 * (1 - penalty / totalWeight)));
  }
  return scores;
}

export function calculateScore(items) {
  const categories = calculateCategoryScores(items);
  const entries = Object.entries(categories);
  if (!entries.length) return 100;

  let weighted = 0;
  let totalImportance = 0;
  for (const [category, score] of entries) {
    const importance = categoryImportance[category] ?? 0.05;
    weighted += score * importance;
    totalImportance += importance;
  }
  let result = clamp(Math.round(weighted / totalImportance));
  if (items.some((item) => item.severity === 'fail' && item.critical === true)) result = Math.min(result, 79);
  return result;
}

export function summarizeSeverities(items) {
  const summary = { pass: 0, info: 0, warning: 0, fail: 0 };
  for (const item of items) {
    if (Object.hasOwn(summary, item.severity)) summary[item.severity] += 1;
  }
  return summary;
}

function normalizeWeight(weight) {
  const value = Number(weight ?? 1);
  return Number.isFinite(value) && value > 0 ? value : 1;
}

function clamp(value) {
  return Math.max(0, Math.min(100, value));
}
