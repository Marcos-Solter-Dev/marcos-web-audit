import { readFile, readdir, writeFile } from 'node:fs/promises';

const dir = new URL('../src/audits/', import.meta.url);
const files = (await readdir(dir)).filter((name) => name.endsWith('.js')).sort();
const functions = '(?:a11y|bp|perf|item|seoItem|http|pwa|privacy|content|sd|discover|crawlItem|sec)';
const categories = {
  'accessibility.js': 'Acessibilidade', 'best-practices.js': 'Boas práticas', 'content.js': 'Conteúdo',
  'crawl.js': 'Crawl', 'discovery.js': 'Descoberta', 'http.js': 'HTTP', 'performance.js': 'Performance',
  'privacy.js': 'Privacidade', 'pwa.js': 'PWA', 'security.js': 'Segurança', 'seo.js': 'SEO',
  'structured-data.js': 'Dados estruturados', 'tls.js': 'Segurança/TLS'
};
const prefixByFile = { 'http.js': 'http-', 'pwa.js': 'pwa-', 'privacy.js': 'privacy-', 'content.js': 'content-', 'structured-data.js': 'structured-' };
const groups = new Map();
const unique = new Set();
for (const file of files) {
  const source = await readFile(new URL(file, dir), 'utf8');
  const regex = new RegExp(`\\b${functions}\\('([^']+)'\\s*,\\s*'([^']+)'`, 'g');
  let match;
  while ((match = regex.exec(source))) {
    const category = categories[file] ?? file;
    const id = `${prefixByFile[file] ?? ''}${match[1]}`;
    const key = `${category}:${id}`;
    if (unique.has(key)) continue;
    unique.add(key);
    if (!groups.has(category)) groups.set(category, []);
    groups.get(category).push({ id, title: match[2] });
  }
}
const lines = [
  '# Catálogo de verificações — Marcos Web Audit v3', '',
  `Este catálogo contém **${unique.size} regras/caminhos de verificação únicos declarados no código**. Nem todas são executadas ao mesmo tempo: algumas dependem de HTTPS, TLS, crawl, manifest PWA, cookies ou outros sinais da página.`, '',
  '> A ferramenta é passiva: faz requisições web normais e inspeciona HTML, headers, TLS e recursos públicos. Não explora vulnerabilidades.', ''
];
for (const category of [...groups.keys()].sort((a, b) => a.localeCompare(b, 'pt-BR'))) {
  const rules = groups.get(category);
  lines.push(`## ${category} (${rules.length})`, '');
  for (const rule of rules) lines.push(`- \`${rule.id}\` — ${rule.title}`);
  lines.push('');
}
await writeFile(new URL('../docs/CHECKS.md', import.meta.url), `${lines.join('\n')}\n`, 'utf8');
console.log(`Gerado docs/CHECKS.md com ${unique.size} regras/caminhos únicos.`);
