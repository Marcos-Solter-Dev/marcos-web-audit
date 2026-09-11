const symbols = { pass: '✓', info: '•', warning: '!', fail: '✕' };
const ansi = {
  reset: '\x1b[0m', bold: '\x1b[1m', gray: '\x1b[90m',
  blue: '\x1b[34m', cyan: '\x1b[36m', green: '\x1b[32m', yellow: '\x1b[33m', red: '\x1b[31m'
};

let forceNoColor = false;

export function printTerminal(report, options = {}) {
  forceNoColor = options.color === false;
  console.log('');
  console.log(color(`Marcos Web Audit ${report.tool.version}`, 'cyan'));
  console.log(color('─'.repeat(72), 'gray'));
  console.log(`${color('URL:', 'bold')} ${report.finalUrl}`);
  console.log(`${color('HTTP:', 'bold')} ${report.status}`);
  console.log(`${color('Score:', 'bold')} ${scoreColor(`${report.score}/100 (${report.grade})`, report.score)}`);
  console.log(`${color('Tempo:', 'bold')} ${report.durationMs} ms`);
  console.log(`${color('Resumo:', 'bold')} ${report.summary.fail} falha(s), ${report.summary.warning} aviso(s), ${report.summary.pass} aprovado(s)`);
  if (report.coverage) console.log(`${color('Cobertura:', 'bold')} ${report.coverage.checksExecuted} checks · ${report.coverage.categories} categorias`);

  console.log(`\n${color('Scores por categoria', 'bold')}`);
  for (const [category, score] of Object.entries(report.categoryScores)) {
    console.log(`  ${category.padEnd(18)} ${scoreColor(String(score).padStart(3), score)}/100`);
  }

  let currentCategory;
  for (const item of report.items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      console.log(`\n${color(currentCategory, 'bold')}`);
    }
    const tone = severityColor(item.severity);
    console.log(`${color(symbols[item.severity] ?? '•', tone)} ${color(item.title, 'bold')} — ${color(item.message, tone)}`);
    if (item.recommendation) console.log(color(`  ↳ ${item.recommendation}`, 'gray'));
  }

  if (report.metadata.technologies.length) {
    console.log(`\n${color('Tecnologias detectadas:', 'bold')} ${report.metadata.technologies.join(', ')}`);
  }

  if (report.links.issues.length) {
    console.log(`\n${color('Links com problema:', 'yellow')}`);
    for (const issue of report.links.issues.slice(0, 20)) {
      console.log(`- ${issue.url} ${issue.status ? `(HTTP ${issue.status})` : `(${issue.error})`}`);
    }
    if (report.links.issues.length > 20) console.log(color(`  … mais ${report.links.issues.length - 20}`, 'gray'));
  }

  if (report.crawl.pages.length) {
    console.log(`\n${color('Crawl interno:', 'bold')}`);
    for (const page of report.crawl.pages.slice(0, 12)) {
      const label = page.error ? 'erro' : page.skipped ? 'ignorado' : `${page.score}/100`;
      console.log(`- ${label.padEnd(10)} ${page.url}`);
    }
  }

  if (report.comparison) printComparison(report.comparison);
  console.log('');
}

export function printComparison(comparison) {
  const sign = comparison.scoreDelta > 0 ? '+' : '';
  console.log(`\n${color('Comparação:', 'bold')} ${comparison.previousScore} → ${comparison.currentScore} (${sign}${comparison.scoreDelta})`);
  if (comparison.fixedIssues.length) console.log(color(`  Corrigidos: ${comparison.fixedIssues.join(', ')}`, 'green'));
  if (comparison.newIssues.length) console.log(color(`  Novos problemas: ${comparison.newIssues.join(', ')}`, 'yellow'));
}

function useColor() {
  return !forceNoColor && process.stdout.isTTY && !process.env.NO_COLOR;
}
function color(value, name) { return useColor() ? `${ansi[name]}${value}${ansi.reset}` : value; }
function severityColor(severity) { return severity === 'pass' ? 'green' : severity === 'warning' ? 'yellow' : severity === 'fail' ? 'red' : 'blue'; }
function scoreColor(value, score) { return color(value, score >= 90 ? 'green' : score >= 70 ? 'yellow' : 'red'); }
