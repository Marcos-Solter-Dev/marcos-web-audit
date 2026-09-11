import { access, readFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const root = resolve(new URL('..', import.meta.url).pathname);
const readme = await readFile(resolve(root, 'README.md'), 'utf8');
const links = [...readme.matchAll(/\[[^\]]+\]\((?!https?:|mailto:|#)([^)]+)\)/g)].map((m) => m[1].split('#')[0]).filter(Boolean);
const missing = [];
for (const link of new Set(links)) {
  try { await access(resolve(root, link)); } catch { missing.push(link); }
}
if (missing.length) throw new Error(`Links locais ausentes no README: ${missing.join(', ')}`);
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'));
const cli = await readFile(resolve(root, 'src/cli.js'), 'utf8');
const auditor = await readFile(resolve(root, 'src/auditor.js'), 'utf8');
if (!cli.includes(`const VERSION = '${pkg.version}'`)) throw new Error('Versão do CLI divergente do package.json.');
if (!auditor.includes(`version: '${pkg.version}'`)) throw new Error('Versão do auditor divergente do package.json.');
const checks = await readFile(resolve(root, 'docs/CHECKS.md'), 'utf8');
if (!/\*\*\d+ regras\/caminhos/.test(checks)) throw new Error('docs/CHECKS.md não contém contagem de regras.');
console.log(`OK: documentação local e versão ${pkg.version} consistentes.`);
