#!/usr/bin/env node
import { appendFile, mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, resolve } from 'node:path';
import { auditSite } from './auditor.js';
import { createBadge } from './reporters/badge.js';
import { createHtmlReport } from './reporters/html.js';
import { createGithubSummary, createMarkdownReport } from './reporters/markdown.js';
import { createSarifReport } from './reporters/sarif.js';
import { printTerminal } from './reporters/terminal.js';
import { compareReports } from './utils/compare.js';
import { loadConfig } from './utils/config.js';

const VERSION = '3.0.0';
const HELP = `
Marcos Web Audit v${VERSION}
Auditoria web passiva com 200+ sinais/verificações de segurança, SEO, acessibilidade,
performance, HTTP, PWA, privacidade, conteúdo, links e dados estruturados.

Uso:
  web-audit <url> [opções]
  npm run audit -- <url> [opções]

Scan:
  --pages <n>            Páginas internas a analisar no crawl (padrão: 8)
  --max-links <n>        Máximo de links a testar (padrão: 60)
  --external-links       Inclui links externos na checagem
  --timeout <ms>         Timeout por requisição (padrão: 10000)
  --concurrency <n>      Concorrência de rede (padrão: 8)
  --retries <n>          Tentativas extras por requisição (padrão: 1)
  --no-links             Desativa checagem de links
  --no-tls               Desativa inspeção TLS
  --no-discovery         Desativa robots/sitemap/security.txt
  --no-pwa               Desativa busca/validação de Web App Manifest
  --only <categorias>    Executa/reporta somente categorias (separadas por vírgula)
  --exclude <regras>     Exclui IDs de regra (separados por vírgula)

Relatórios:
  --json <arquivo>       Salva relatório completo em JSON
  --html <arquivo>       Salva dashboard HTML interativo
  --md <arquivo>         Salva relatório Markdown
  --sarif <arquivo>      Salva SARIF 2.1.0 para integrações de CI/code scanning
  --badge <arquivo>      Salva JSON compatível com Shields endpoint
  --history <arquivo>    Acrescenta uma linha JSON com o score ao histórico
  --compare <arquivo>    Compara com um relatório JSON anterior
  --github-summary       Escreve o resumo no GITHUB_STEP_SUMMARY

Qualidade / CI:
  --fail-under <score>   Exit code 2 se o score ficar abaixo do valor
  --fail-on <nível>      Exit code 2 se houver "fail" ou "warning"
  --config <arquivo>     Usa config JSON (padrão automático: .marcos-audit.json)
  --quiet                Não imprime o relatório detalhado no terminal
  --no-color             Desativa cores ANSI
  -h, --help             Exibe esta ajuda
  -v, --version          Exibe a versão

Exemplos:
  web-audit https://example.com
  web-audit example.com --pages 15 --html reports/site.html --json reports/site.json
  web-audit example.com --sarif reports/site.sarif --fail-under 85 --fail-on fail
  web-audit example.com --only Segurança,SEO,HTTP --exclude server-header,generator
  web-audit example.com --compare report-anterior.json --md diff.md
`;

try {
  const parsed = parseArgs(process.argv.slice(2));
  if (parsed.options.help) {
    console.log(HELP.trim());
    process.exit(0);
  }
  if (parsed.options.version) {
    console.log(VERSION);
    process.exit(0);
  }
  if (!parsed.positional[0]) {
    console.error(HELP.trim());
    process.exit(1);
  }

  const loaded = await loadConfig(parsed.options.config);
  const settings = mergeSettings(loaded.config, parsed.options);
  const report = await auditSite(parsed.positional[0], settings);

  if (settings.compare) {
    const previous = JSON.parse(await readFile(resolve(settings.compare), 'utf8'));
    report.comparison = compareReports(previous, report);
  }

  if (!settings.quiet) printTerminal(report, { color: settings.color !== false });
  else console.log(`${report.score}/100 ${report.grade} · ${report.coverage.checksExecuted} checks · ${report.finalUrl}`);

  if (settings.json) await save(settings.json, `${JSON.stringify(report, null, 2)}\n`);
  if (settings.html) await save(settings.html, createHtmlReport(report));
  if (settings.md) await save(settings.md, createMarkdownReport(report));
  if (settings.sarif) await save(settings.sarif, `${JSON.stringify(createSarifReport(report), null, 2)}\n`);
  if (settings.badge) await save(settings.badge, `${JSON.stringify(createBadge(report), null, 2)}\n`);
  if (settings.history) await appendHistory(settings.history, report);
  if (settings.githubSummary) await writeGithubSummary(report);

  if (qualityGateFailed(report, settings)) process.exitCode = 2;
} catch (error) {
  console.error(`Erro: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}

function mergeSettings(config, cli) {
  const defaults = {
    timeoutMs: 10_000,
    maxLinks: 60,
    maxPages: 8,
    concurrency: 8,
    retries: 1,
    checkLinks: true,
    checkTls: true,
    checkDiscovery: true,
    checkPwa: true,
    externalLinks: false,
    color: true
  };
  return { ...defaults, ...config, ...withoutUndefined(cli), timeoutMs: cli.timeout ?? config.timeoutMs ?? defaults.timeoutMs };
}

function parseArgs(args) {
  const positional = [];
  const options = {};
  for (let i = 0; i < args.length; i += 1) {
    const arg = args[i];
    if (arg === '-h' || arg === '--help') options.help = true;
    else if (arg === '-v' || arg === '--version') options.version = true;
    else if (arg === '--no-links') options.checkLinks = false;
    else if (arg === '--no-tls') options.checkTls = false;
    else if (arg === '--no-discovery') options.checkDiscovery = false;
    else if (arg === '--no-pwa') options.checkPwa = false;
    else if (arg === '--external-links') options.externalLinks = true;
    else if (arg === '--github-summary') options.githubSummary = true;
    else if (arg === '--quiet') options.quiet = true;
    else if (arg === '--no-color') options.color = false;
    else if (arg === '--json') options.json = requiredValue(args, ++i, '--json');
    else if (arg === '--html') options.html = requiredValue(args, ++i, '--html');
    else if (arg === '--md') options.md = requiredValue(args, ++i, '--md');
    else if (arg === '--sarif') options.sarif = requiredValue(args, ++i, '--sarif');
    else if (arg === '--badge') options.badge = requiredValue(args, ++i, '--badge');
    else if (arg === '--history') options.history = requiredValue(args, ++i, '--history');
    else if (arg === '--compare') options.compare = requiredValue(args, ++i, '--compare');
    else if (arg === '--config') options.config = requiredValue(args, ++i, '--config');
    else if (arg === '--only') options.onlyCategories = requiredValue(args, ++i, '--only');
    else if (arg === '--exclude') options.excludeRules = requiredValue(args, ++i, '--exclude');
    else if (arg === '--pages') options.maxPages = numericValue(args, ++i, '--pages');
    else if (arg === '--max-links') options.maxLinks = numericValue(args, ++i, '--max-links');
    else if (arg === '--timeout') options.timeout = numericValue(args, ++i, '--timeout');
    else if (arg === '--concurrency') options.concurrency = numericValue(args, ++i, '--concurrency');
    else if (arg === '--retries') options.retries = numericValue(args, ++i, '--retries');
    else if (arg === '--fail-under') options.failUnder = numericValue(args, ++i, '--fail-under');
    else if (arg === '--fail-on') options.failOn = requiredValue(args, ++i, '--fail-on').toLowerCase();
    else if (arg.startsWith('-')) throw new Error(`Opção desconhecida: ${arg}`);
    else positional.push(arg);
  }
  if (options.failOn && !['fail', 'warning'].includes(options.failOn)) throw new Error('--fail-on aceita apenas "fail" ou "warning".');
  return { positional, options };
}

function qualityGateFailed(report, settings) {
  if (settings.failUnder !== undefined && report.score < Number(settings.failUnder)) return true;
  if (settings.failOn === 'fail' && report.summary.fail > 0) return true;
  if (settings.failOn === 'warning' && (report.summary.fail > 0 || report.summary.warning > 0)) return true;
  return false;
}

async function save(path, content) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  await writeFile(absolute, content, 'utf8');
  console.log(`Salvo: ${absolute}`);
}

async function appendHistory(path, report) {
  const absolute = resolve(path);
  await mkdir(dirname(absolute), { recursive: true });
  const row = {
    scannedAt: report.scannedAt,
    target: report.finalUrl,
    score: report.score,
    grade: report.grade,
    categoryScores: report.categoryScores,
    summary: report.summary,
    checksExecuted: report.coverage?.checksExecuted,
    durationMs: report.durationMs
  };
  await appendFile(absolute, `${JSON.stringify(row)}\n`, 'utf8');
  console.log(`Histórico atualizado: ${absolute}`);
}

async function writeGithubSummary(report) {
  const path = process.env.GITHUB_STEP_SUMMARY;
  if (!path) throw new Error('--github-summary só funciona quando GITHUB_STEP_SUMMARY está definido.');
  await appendFile(path, `\n${createGithubSummary(report)}\n`, 'utf8');
}

function requiredValue(args, index, option) {
  const value = args[index];
  if (!value || value.startsWith('--')) throw new Error(`${option} exige um valor.`);
  return value;
}

function numericValue(args, index, option) {
  const value = requiredValue(args, index, option);
  const number = Number(value);
  if (!Number.isFinite(number)) throw new Error(`${option} exige um número válido.`);
  return number;
}

function withoutUndefined(object) {
  return Object.fromEntries(Object.entries(object).filter(([, value]) => value !== undefined));
}
