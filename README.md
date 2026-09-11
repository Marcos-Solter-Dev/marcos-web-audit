# Marcos Web Audit

[![CI](https://github.com/Marcos-Solter-Dev/marcos-web-audit/actions/workflows/ci.yml/badge.svg)](https://github.com/Marcos-Solter-Dev/marcos-web-audit/actions/workflows/ci.yml)
[![Node.js](https://img.shields.io/badge/Node.js-%3E%3D20-339933?logo=node.js&logoColor=white)](https://nodejs.org/)
[![License: Marcos Dev](https://img.shields.io/badge/License-Marcos%20Dev%20Source--Available-016FF7.svg)](LICENSE)

Auditor web passivo em Node.js para fazer um **check-up técnico de sites** pelo terminal, CI ou GitHub Actions.

A versão 3 amplia o projeto para **mais de 200 caminhos de verificação** cobrindo segurança, SEO, acessibilidade, performance, HTTP, PWA, privacidade, conteúdo, dados estruturados, links, descoberta, TLS e crawl interno.

> O objetivo é diagnóstico passivo. A ferramenta faz requisições web normais e analisa respostas públicas; ela não tenta explorar vulnerabilidades, quebrar autenticação ou executar ataques.

## O que ele verifica

Alguns exemplos:

- **Segurança:** HTTPS, CSP por diretiva, HSTS, clickjacking, cookies, SameSite, CORS, mixed content, formulários inseguros, COOP/COEP/CORP, iframes, headers e cache sensível.
- **SEO:** title, description, H1, canonical, robots, hreflang, Open Graph, Twitter/X Card, soft-404 heurístico, favicon, viewport e consistência de metadados.
- **Acessibilidade:** labels, nomes acessíveis, alt, headings, ARIA quebrada, iframes, tabelas, vídeos, áudio, tabindex, autofocus, landmarks, skip links e zoom.
- **Performance:** TTFB indicativo, tamanho do HTML, compressão, scripts síncronos, recursos, DOM, CSS/JS inline, lazy loading, srcset, preload/preconnect, imagens modernas, cache e terceiros.
- **HTTP:** status, Content-Type, charset, ETag, Last-Modified, Vary, X-Robots-Tag, Server-Timing, Alt-Svc e outros sinais da resposta.
- **PWA:** manifest, JSON válido, name, short_name, start_url, scope, display, cores, ícones 192/512, maskable, theme-color e sinal de Service Worker.
- **Privacidade:** scripts/iframes/forms de terceiros, trackers conhecidos, política de privacidade, APIs sensíveis, permissões e pixels externos pequenos.
- **Conteúdo:** lorem ipsum, placeholders, encoding quebrado, headings/parágrafos vazios, IDs duplicados, links genéricos, quantidade de texto e URLs muito longas.
- **Dados estruturados:** JSON-LD, sintaxe, @context, @type, @id, URLs, formatos mistos, BreadcrumbList e entidades de identidade.
- **Links e crawl:** links quebrados, redirects, latência, páginas internas, score por página e títulos/descriptions duplicados.
- **TLS e descoberta:** versão TLS, validade de certificado, robots.txt, sitemap.xml e security.txt.

O catálogo gerado a partir do código fica em [`docs/CHECKS.md`](docs/CHECKS.md).

## Requisitos

- Node.js 20 ou superior.
- Não há dependências externas de runtime.

## Instalação

```bash
npm install
```

## Uso rápido

```bash
npm run audit -- https://example.com
```

Ou, depois de instalar globalmente/usar o binário do pacote:

```bash
marcos-audit https://example.com
```

## Auditoria completa

```bash
npm run audit -- https://example.com \
  --pages 15 \
  --max-links 120 \
  --external-links \
  --html reports/site.html \
  --json reports/site.json \
  --md reports/site.md \
  --sarif reports/site.sarif \
  --badge reports/badge.json \
  --history reports/history.jsonl
```

## Filtrar categorias e regras

Auditar só Segurança, SEO e HTTP:

```bash
npm run audit -- https://example.com --only Segurança,SEO,HTTP
```

Ignorar regras específicas:

```bash
npm run audit -- https://example.com --exclude server-header,generator
```

Também é possível usar o formato qualificado `categoria:regra`.

## Quality gate para CI

Falhar o job se o score ficar abaixo de 85:

```bash
npm run audit -- https://example.com --fail-under 85
```

Falhar se existir qualquer achado `fail`:

```bash
npm run audit -- https://example.com --fail-on fail
```

Ou ser mais rígido e falhar também em warnings:

```bash
npm run audit -- https://example.com --fail-on warning
```

Exit codes:

- `0`: auditoria executada e gates aprovados;
- `1`: erro de execução/configuração;
- `2`: quality gate não aprovado.

## Relatórios

A v3 pode gerar:

- **Terminal:** visão rápida por categoria;
- **HTML:** dashboard navegável;
- **JSON:** relatório completo para automações;
- **Markdown:** documentação/PRs;
- **SARIF 2.1.0:** integração com ferramentas de CI e code scanning;
- **Shields endpoint JSON:** badge de score;
- **JSONL de histórico:** evolução de score ao longo do tempo.

Exemplo:

```bash
npm run audit -- https://example.com \
  --html reports/audit.html \
  --json reports/audit.json \
  --sarif reports/audit.sarif
```

## Comparar duas auditorias

Primeiro salve um baseline:

```bash
npm run audit -- https://example.com --json reports/baseline.json
```

Depois compare:

```bash
npm run audit -- https://example.com \
  --compare reports/baseline.json \
  --html reports/after.html
```

O relatório calcula delta de score e identifica problemas novos/corrigidos.

## Arquivo de configuração

Copie o exemplo:

```bash
cp .marcos-audit.example.json .marcos-audit.json
```

Exemplo:

```json
{
  "maxPages": 8,
  "maxLinks": 60,
  "timeoutMs": 10000,
  "concurrency": 8,
  "retries": 1,
  "checkLinks": true,
  "checkTls": true,
  "checkDiscovery": true,
  "checkPwa": true,
  "externalLinks": false,
  "failUnder": 80,
  "failOn": "fail"
}
```

Valores passados na CLI têm prioridade sobre o arquivo.

## GitHub Actions

O repositório inclui dois workflows:

- `.github/workflows/ci.yml`: testes em Node.js 20 e 22;
- `.github/workflows/audit-site.yml`: auditoria manual de uma URL autorizada e upload dos relatórios.

O workflow de auditoria gera HTML, JSON, SARIF e GitHub Step Summary.

## Scripts

```bash
npm test
npm run check
npm run demo
```

## Estrutura

```text
src/
├── auditor.js
├── cli.js
├── audits/
│   ├── accessibility.js
│   ├── best-practices.js
│   ├── content.js
│   ├── crawl.js
│   ├── discovery.js
│   ├── http.js
│   ├── links.js
│   ├── performance.js
│   ├── privacy.js
│   ├── pwa.js
│   ├── security.js
│   ├── seo.js
│   ├── structured-data.js
│   ├── technology.js
│   └── tls.js
├── reporters/
│   ├── badge.js
│   ├── html.js
│   ├── markdown.js
│   ├── sarif.js
│   └── terminal.js
└── utils/
```

## Limitações importantes

Este projeto usa análise estática/passiva e heurísticas. Portanto:

- não substitui Lighthouse/WebPageTest para métricas reais de navegador e Core Web Vitals;
- não substitui axe/WAVE/testes manuais de acessibilidade;
- não substitui pentest, DAST autorizado ou revisão especializada de segurança;
- não executa JavaScript da página como um navegador completo;
- algumas verificações são informativas e dependem do contexto do site.

O score deve ser usado como **sinal para priorização**, não como certificação.

## Verificação do projeto

Antes de publicar uma mudança, execute a verificação completa do repositório:

```bash
npm run verify
```

Ela valida sintaxe, testes, catálogo de regras, documentação, relatórios, pacote npm e instalação em um ambiente limpo. Veja [`docs/QUALITY.md`](docs/QUALITY.md).

## Segurança e uso responsável

Faça auditorias em sites seus ou em ambientes onde você tem autorização. Veja [`SECURITY.md`](SECURITY.md).

## Contribuindo

Leia [`CONTRIBUTING.md`](CONTRIBUTING.md) antes de abrir PRs.

## Licença

**Marcos Dev Source-Available License v1.0.** O uso, estudo e modificação para uso próprio são permitidos, mas a redistribuição ou republicação do projeto não é permitida sem autorização da Marcos Dev. Veja [`LICENSE`](LICENSE) e [`MARCOSDEV.md`](MARCOSDEV.md).
