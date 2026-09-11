export function createMarkdownReport(report) {
  const lines = [];
  lines.push(`# Marcos Web Audit — ${report.score}/100 (${report.grade})`, '');
  lines.push(`**URL:** ${report.finalUrl}  `);
  lines.push(`**HTTP:** ${report.status}  `);
  lines.push(`**Data:** ${report.scannedAt}  `);
  lines.push(`**Duração:** ${report.durationMs} ms  `);
  if (report.coverage) lines.push(`**Cobertura:** ${report.coverage.checksExecuted} verificações em ${report.coverage.categories} categorias`);
  lines.push('');
  lines.push('## Scores por categoria', '');
  lines.push('| Categoria | Score |', '|---|---:|');
  for (const [category, score] of Object.entries(report.categoryScores)) lines.push(`| ${escapePipe(category)} | ${score}/100 |`);
  lines.push('', '## Achados', '');

  let currentCategory;
  for (const item of report.items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      lines.push(`### ${currentCategory}`, '');
    }
    const icon = item.severity === 'pass' ? '✅' : item.severity === 'fail' ? '❌' : item.severity === 'warning' ? '⚠️' : 'ℹ️';
    lines.push(`- ${icon} **${item.title}:** ${item.message}`);
    if (item.recommendation) lines.push(`  - Recomendação: ${item.recommendation}`);
  }

  if (report.crawl.pages.length) {
    lines.push('', '## Crawl interno', '', '| Score | URL | Problemas |', '|---:|---|---:|');
    for (const page of report.crawl.pages) lines.push(`| ${page.score ?? '—'} | ${page.url} | ${page.issues?.length ?? '—'} |`);
  }

  lines.push('', `> Gerado por Marcos Web Audit v${report.tool.version}. Auditoria passiva; não substitui testes especializados de segurança, acessibilidade ou performance.`, '');
  return lines.join('\n');
}

export function createGithubSummary(report) {
  return createMarkdownReport(report);
}

function escapePipe(value) { return String(value).replace(/\|/g, '\\|'); }
