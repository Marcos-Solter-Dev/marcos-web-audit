# Changelog

## 3.0.0

- cobertura ampliada para mais de 200 regras/caminhos de verificação;
- novas categorias: HTTP, PWA, Privacidade, Conteúdo e Dados estruturados;
- CSP analisada por diretivas importantes;
- cookies, CORS, HSTS, COOP/COEP/CORP e isolamento cross-origin aprofundados;
- SEO avançado com canonical, hreflang, social metadata, soft-404 e consistência de metadados;
- acessibilidade ampliada com ARIA, mídia, tabelas, iframes, teclado, landmarks e zoom;
- performance ampliada com DOM, JS/CSS inline, preloads, preconnects, srcset, terceiros e cache;
- validação passiva de Web App Manifest;
- sinais de privacidade e trackers comuns;
- validação básica de JSON-LD e Schema.org;
- filtro por categorias (`--only`) e exclusão de regras (`--exclude`);
- exportação SARIF 2.1.0;
- dashboard HTML e saída de terminal com cobertura total;
- catálogo `docs/CHECKS.md` gerado a partir do código;
- suíte de testes expandida e validações adicionais de qualidade.

## 2.0.0

- score geral ponderado e scores por categoria;
- auditorias expandidas de segurança e CSP/HSTS/cookies;
- inspeção TLS e expiração de certificado;
- auditorias dedicadas de acessibilidade, performance e boas práticas;
- crawl de páginas internas;
- detecção de títulos e descriptions duplicados;
- checagem de links com concorrência e retries;
- `security.txt`, robots e sitemap;
- relatórios HTML, Markdown, JSON e badge;
- comparação de auditorias;
- histórico JSONL;
- arquivo de configuração;
- quality gates para CI;
- GitHub Step Summary;
- suíte de testes ampliada.

## 1.0.0

- auditoria inicial de segurança, SEO, links e arquivos de descoberta.
