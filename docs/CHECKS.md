# Catálogo de verificações — Marcos Web Audit v3

Este catálogo contém **232 regras/caminhos de verificação únicos declarados no código**. Nem todas são executadas ao mesmo tempo: algumas dependem de HTTPS, TLS, crawl, manifest PWA, cookies ou outros sinais da página.

> A ferramenta é passiva: faz requisições web normais e inspeciona HTML, headers, TLS e recursos públicos. Não explora vulnerabilidades.

## Acessibilidade (26)

- `lang` — Idioma do documento
- `image-alt` — Texto alternativo em imagens
- `form-labels` — Rótulos de formulários
- `button-name` — Nome acessível de botões
- `link-name` — Nome acessível de links
- `heading-order` — Ordem dos headings
- `empty-headings` — Headings vazios
- `iframe-title` — Título de iframes
- `input-image-alt` — Alt em input[type=image]
- `filename-alt` — Alt que parece nome de arquivo
- `svg-name` — Nome acessível de SVG
- `table-headers` — Cabeçalhos de tabela
- `table-caption` — Caption de tabela
- `video-captions` — Legendas em vídeo
- `audio-controls` — Controles de áudio
- `positive-tabindex` — tabindex positivo
- `autofocus` — Autofocus
- `empty-aria-label` — aria-label vazio
- `broken-labelledby` — aria-labelledby válido
- `broken-describedby` — aria-describedby válido
- `skip-link` — Atalho para conteúdo principal
- `main-landmark` — Landmark principal
- `nav-landmark` — Landmark de navegação
- `zoom` — Zoom do usuário
- `obsolete-animation` — Elementos marquee/blink
- `duplicate-accesskey` — Accesskeys duplicadas

## Boas práticas (21)

- `doctype` — HTML5 doctype
- `charset` — Charset explícito
- `sri` — Subresource Integrity
- `target-blank` — Links target="_blank"
- `inline-events` — Handlers inline
- `html-comments` — Comentários potencialmente sensíveis
- `charset-early` — Charset no início do documento
- `duplicate-charset` — Declarações de charset duplicadas
- `protocol-relative` — URLs protocol-relative
- `javascript-urls` — URLs javascript:
- `empty-href` — Links com href vazio
- `meta-refresh` — Meta refresh
- `deprecated-tags` — Elementos HTML obsoletos
- `form-method` — Método de formulários explícito
- `password-get` — Senha em formulário GET
- `base-tag` — Uso de <base>
- `inline-style` — Estilos inline
- `css-import` — @import em CSS inline
- `noscript` — Fallback noscript
- `modern-js` — Scripts module/nomodule
- `x-ua-compatible` — X-UA-Compatible legado

## Conteúdo (15)

- `content-word-count` — Quantidade de conteúdo textual
- `content-text-ratio` — Relação texto/HTML
- `content-lorem-ipsum` — Lorem ipsum
- `content-placeholder-copy` — Textos provisórios
- `content-replacement-char` — Caracteres de substituição
- `content-empty-headings` — Headings vazios
- `content-long-headings` — Headings excessivamente longos
- `content-empty-paragraphs` — Parágrafos vazios
- `content-long-paragraphs` — Parágrafos muito longos
- `content-generic-anchor-text` — Textos genéricos de link
- `content-duplicate-ids` — IDs duplicados
- `content-fragment-links` — Links somente para fragmentos
- `content-long-links` — URLs muito longas
- `content-nonempty-body` — Conteúdo principal não vazio
- `content-title-like-placeholder` — Título provisório no conteúdo

## Crawl (4)

- `pages` — Páginas internas rastreadas
- `low-score` — Qualidade das páginas internas
- `duplicate-title` — Títulos duplicados
- `duplicate-description` — Descriptions duplicadas

## Dados estruturados (13)

- `structured-presence` — JSON-LD presente
- `structured-valid-json` — JSON-LD com JSON válido
- `structured-context` — @context
- `structured-type` — @type
- `structured-urls` — URLs em dados estruturados
- `structured-duplicate-id` — @id duplicado
- `structured-graph` — @graph
- `structured-breadcrumb` — BreadcrumbList
- `structured-identity-entity` — Entidade de identidade
- `structured-website-entity` — Entidade WebSite
- `structured-microdata` — Microdata HTML
- `structured-rdfa` — RDFa
- `structured-mixed-formats` — Múltiplos formatos estruturados

## Descoberta (4)

- `robots` — robots.txt
- `robots-sitemap` — Sitemap no robots.txt
- `sitemap` — sitemap.xml
- `security-txt` — security.txt

## HTTP (14)

- `http-status` — Status HTTP principal
- `http-content-type` — Content-Type HTML
- `http-charset-header` — Charset no header HTTP
- `http-content-language` — Content-Language
- `http-etag` — ETag
- `http-last-modified` — Last-Modified
- `http-cache-validator` — Validador de cache
- `http-vary` — Header Vary
- `http-x-robots-tag` — X-Robots-Tag
- `http-content-length` — Content-Length
- `http-server-timing` — Server-Timing
- `http-alt-svc` — HTTP/3 / Alt-Svc
- `http-accept-ranges` — Accept-Ranges
- `http-age` — Idade de cache intermediário

## Performance (29)

- `ttfb` — Tempo até os headers
- `html-size` — Tamanho do HTML
- `compression` — Compressão de resposta
- `resources` — Quantidade de recursos
- `render-blocking` — Scripts potencialmente bloqueantes
- `lazy-images` — Lazy loading de imagens
- `image-dimensions` — Dimensões de imagens
- `cache-control` — Cache-Control
- `script-count` — Quantidade de scripts
- `stylesheet-count` — Quantidade de stylesheets
- `sync-scripts` — Scripts externos síncronos
- `inline-js-size` — JavaScript inline
- `inline-css-size` — CSS inline
- `srcset` — Imagens responsivas
- `modern-images` — Formatos modernos de imagem
- `preload-count` — Preloads
- `preconnect-count` — Preconnects
- `modulepreload` — Modulepreload
- `data-uri` — Data URIs
- `dom-size` — Tamanho aproximado do DOM
- `third-party-origins` — Origens de terceiros
- `duplicate-resources` — Recursos duplicados
- `hero-lazy` — Primeira imagem com lazy loading
- `hero-priority` — Prioridade da primeira imagem
- `font-preload-crossorigin` — Fontes preload com crossorigin
- `cache-validator` — Validação de cache do HTML
- `cache-max-age` — max-age do HTML
- `vary-encoding` — Vary e compressão
- `print-css` — CSS de impressão

## Privacidade (12)

- `privacy-third-party-scripts` — Scripts de terceiros
- `privacy-third-party-iframes` — Iframes de terceiros
- `privacy-third-party-forms` — Formulários para terceiros
- `privacy-tracker-signals` — Sinais de analytics/tracking
- `privacy-privacy-link` — Link de política de privacidade
- `privacy-cookie-link` — Informação sobre cookies
- `privacy-sensitive-apis` — APIs sensíveis do navegador
- `privacy-permissions-wildcard` — Permissions-Policy permissiva
- `privacy-referrer-policy` — Privacidade de Referer
- `privacy-external-images` — Imagens de terceiros
- `privacy-tracking-pixels` — Pixels externos minúsculos
- `privacy-password-autocomplete` — Autocomplete de senhas

## PWA (18)

- `pwa-manifest-link` — Web App Manifest
- `pwa-manifest-fetch` — Manifest acessível
- `pwa-name` — Nome da aplicação
- `pwa-short-name` — Nome curto
- `pwa-start-url` — start_url
- `pwa-scope` — Scope da PWA
- `pwa-display` — Modo de exibição
- `pwa-theme-color-manifest` — theme_color no manifest
- `pwa-background-color` — background_color
- `pwa-icon-192` — Ícone 192×192
- `pwa-icon-512` — Ícone 512×512
- `pwa-maskable-icon` — Ícone maskable
- `pwa-theme-color-meta` — Meta theme-color
- `pwa-service-worker` — Sinal de Service Worker
- `pwa-apple-touch-icon` — Apple touch icon
- `pwa-mask-icon` — Mask icon
- `pwa-mobile-capable` — Metadados de modo app
- `pwa-manifest-id` — ID do manifest

## Segurança (37)

- `https` — HTTPS
- `csp` — Content-Security-Policy
- `csp-default-src` — CSP default-src
- `csp-object-src` — CSP object-src
- `csp-base-uri` — CSP base-uri
- `csp-form-action` — CSP form-action
- `csp-frame-ancestors` — CSP frame-ancestors
- `csp-unsafe-inline` — CSP unsafe-inline
- `csp-unsafe-eval` — CSP unsafe-eval
- `csp-report-only` — CSP Report-Only
- `hsts` — Strict-Transport-Security
- `hsts-subdomains` — HSTS includeSubDomains
- `hsts-preload` — HSTS preload
- `nosniff` — X-Content-Type-Options
- `referrer-policy` — Referrer-Policy
- `permissions-policy` — Permissions-Policy
- `clickjacking` — Proteção contra clickjacking
- `server-header` — Exposição do servidor
- `x-powered-by` — X-Powered-By
- `cookies` — Atributos de cookies
- `cookie-samesite-none` — SameSite=None exige Secure
- `cookie-prefix` — Prefixos de cookie
- `cookie-domain` — Escopo Domain de cookies
- `cors-wildcard` — CORS wildcard
- `coop` — Cross-Origin-Opener-Policy
- `coep` — Cross-Origin-Embedder-Policy
- `corp` — Cross-Origin-Resource-Policy
- `origin-agent-cluster` — Origin-Agent-Cluster
- `reporting-endpoints` — Reporting API
- `cross-domain-policy` — Política cross-domain legada
- `mixed-content` — Conteúdo misto
- `insecure-forms` — Envio de formulários
- `external-forms` — Formulários cross-origin
- `http-links` — Links HTTP explícitos
- `iframe-sandbox` — Sandbox de iframes externos
- `iframe-sandbox-risk` — Combinação de sandbox permissiva
- `sensitive-cache` — Cache de respostas com sessão

## Segurança/TLS (4)

- `tls-authorized` — Validação TLS
- `tls-version` — Versão TLS
- `certificate-expiry` — Validade do certificado
- `tls-check` — Inspeção TLS

## SEO (35)

- `title` — Título da página
- `description` — Meta description
- `h1` — Estrutura de H1
- `canonical` — URL canônica
- `lang` — Idioma da página
- `viewport` — Viewport responsivo
- `robots-meta` — Meta robots
- `open-graph` — Open Graph
- `twitter-card` — Twitter/X Card
- `structured-data` — Dados estruturados
- `favicon` — Favicon
- `single-title` — Único elemento title
- `single-description` — Única meta description
- `single-canonical` — Única canonical
- `canonical-absolute` — Canonical absoluta
- `canonical-origin` — Origem da canonical
- `canonical-self` — Self-canonical
- `canonical-fragment` — Canonical sem fragmento
- `robots-duplicates` — Meta robots duplicada
- `robots-nofollow` — Meta nofollow
- `title-placeholder` — Título genérico/provisório
- `h1-length` — Comprimento do H1
- `og-url` — Open Graph URL
- `og-type` — Open Graph type
- `og-image-absolute` — Open Graph image absoluta
- `twitter-complete` — Twitter/X Card completa
- `hreflang` — Hreflang
- `hreflang-valid` — Formato hreflang
- `hreflang-x-default` — Hreflang x-default
- `generic-links` — Anchor text descritivo
- `soft-404-copy` — Sinais de soft 404
- `content-depth` — Conteúdo indexável aproximado
- `meta-keywords` — Meta keywords legado
- `generator` — Meta generator
- `search-input` — Busca interna detectada
