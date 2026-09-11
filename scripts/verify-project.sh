#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

section() { printf '\n== %s ==\n' "$1"; }

section "Syntax"
while IFS= read -r file; do node --check "$file" >/dev/null; done < <(find src tests scripts -type f \( -name '*.js' -o -name '*.mjs' \) | sort)
echo "OK"

section "Tests"
npm test

section "Rules and docs"
node scripts/verify-rules.mjs
node scripts/generate-checks-doc.mjs
node scripts/verify-docs.mjs

section "End-to-end fixture and reports"
rm -rf .review-output
node scripts/selftest-fixture.mjs
node --input-type=module <<'NODE'
import { readFile } from 'node:fs/promises';
const report = JSON.parse(await readFile('.review-output/report.json', 'utf8'));
const sarif = JSON.parse(await readFile('.review-output/report.sarif', 'utf8'));
const html = await readFile('.review-output/report.html', 'utf8');
const md = await readFile('.review-output/report.md', 'utf8');
if (report.schemaVersion !== 3) throw new Error('schemaVersion inválido');
if (report.tool.version !== '3.0.0') throw new Error('versão inválida no JSON');
if (report.coverage.checksExecuted < 200) throw new Error('cobertura abaixo de 200 checks');
if (sarif.version !== '2.1.0' || !Array.isArray(sarif.runs)) throw new Error('SARIF inválido');
if (!/^<!doctype html>/i.test(html)) throw new Error('HTML inválido');
if (!md.includes('# Marcos Web Audit')) throw new Error('Markdown inválido');
const allowed = new Set(['pass','info','warning','fail']);
const keys = new Set();
for (const item of report.items) {
  if (!item.category || !item.id || !item.title || !allowed.has(item.severity)) throw new Error(`item inválido: ${JSON.stringify(item)}`);
  if (!(Number(item.weight ?? 1) > 0)) throw new Error(`peso inválido em ${item.category}:${item.id}`);
  const key = `${item.category}:${item.id}`;
  if (keys.has(key)) throw new Error(`ID duplicado em runtime: ${key}`);
  keys.add(key);
}
const actual = { pass:0, info:0, warning:0, fail:0 };
for (const item of report.items) actual[item.severity]++;
if (JSON.stringify(actual) !== JSON.stringify(report.summary)) throw new Error('summary divergente');
if (report.score < 0 || report.score > 100) throw new Error('score fora de faixa');
console.log(`OK: ${report.coverage.checksExecuted} checks e formatos válidos.`);
NODE

section "Repository hygiene and package"
if grep -RIE --exclude-dir=node_modules --exclude-dir=.review-output --exclude='verify-project.sh' '(-----BEGIN (RSA |EC |OPENSSH )?PRIVATE KEY-----|sk-proj-[A-Za-z0-9_-]{20,}|ghp_[A-Za-z0-9]{30,}|xox[baprs]-[A-Za-z0-9-]{20,}|AKIA[0-9A-Z]{16})' .; then
  echo "Possível segredo detectado" >&2
  exit 1
fi
npm pack --dry-run --json > .review-output/pack-dry-run.json
node --input-type=module <<'NODE'
import { readFile } from 'node:fs/promises';
const data = JSON.parse(await readFile('.review-output/pack-dry-run.json', 'utf8'))[0];
const paths = new Set(data.files.map((f) => f.path));
for (const required of ['README.md','LICENSE','SECURITY.md','src/cli.js','src/auditor.js','src/reporters/sarif.js']) {
  if (!paths.has(required)) throw new Error(`arquivo ausente do pacote: ${required}`);
}
if (data.files.some((f) => f.path.includes('.review-output'))) throw new Error('artefato temporário entrou no pacote');
console.log(`OK: ${data.files.length} arquivos no pacote.`);
NODE

section "Clean consumer install"
TMP_DIR="$(mktemp -d)"
TGZ="$(npm pack --silent)"
cleanup() { rm -rf "$TMP_DIR"; rm -f "$ROOT/$TGZ"; }
trap cleanup EXIT
npm install --prefix "$TMP_DIR" "$ROOT/$TGZ" --ignore-scripts --no-audit --no-fund >/dev/null
[[ "$("$TMP_DIR/node_modules/.bin/marcos-audit" --version)" == "3.0.0" ]]
"$TMP_DIR/node_modules/.bin/web-audit" --help | grep -q 'Marcos Web Audit v3.0.0'
cleanup
trap - EXIT

echo '\nVerification completed successfully.'
