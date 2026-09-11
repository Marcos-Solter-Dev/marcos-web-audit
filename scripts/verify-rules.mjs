import { readFile, readdir } from 'node:fs/promises';

const dir = new URL('../src/audits/', import.meta.url);
const files = (await readdir(dir)).filter((name) => name.endsWith('.js'));
const functionNames = '(?:a11y|bp|perf|item|seoItem|http|pwa|privacy|content|sd|discover|crawlItem|sec)';
const categoryByFile = {
  'accessibility.js': 'Acessibilidade', 'best-practices.js': 'Boas práticas', 'content.js': 'Conteúdo',
  'crawl.js': 'Crawl', 'discovery.js': 'Descoberta', 'http.js': 'HTTP', 'performance.js': 'Performance',
  'privacy.js': 'Privacidade', 'pwa.js': 'PWA', 'security.js': 'Segurança', 'seo.js': 'SEO',
  'structured-data.js': 'Dados estruturados', 'tls.js': 'Segurança/TLS'
};
const rules = new Map();
for (const file of files) {
  const source = await readFile(new URL(file, dir), 'utf8');
  const regex = new RegExp(`\\b${functionNames}\\('([^']+)'\\s*,\\s*'([^']+)'`, 'g');
  let match;
  while ((match = regex.exec(source))) {
    const key = `${categoryByFile[file] ?? file}:${match[1]}`;
    if (!rules.has(key)) rules.set(key, new Set());
    rules.get(key).add(match[2]);
  }
}
const conflicts = [...rules.entries()].filter(([, titles]) => titles.size > 1);
if (rules.size < 150) throw new Error(`Cobertura estática inesperadamente baixa: ${rules.size}`);
if (conflicts.length) throw new Error(`IDs reutilizados com títulos diferentes: ${conflicts.map(([key]) => key).join(', ')}`);
console.log(`OK: ${rules.size} regras/caminhos estáticos únicos.`);
