import { auditResources, findForms, findTags, parseAttributes } from '../utils/html.js';

export function auditSecurity(headers, url, html = '') {
  const items = [];
  const https = url.protocol === 'https:';
  items.push(item('https', 'HTTPS', https ? 'pass' : 'fail', https ? 'A página final usa HTTPS.' : 'A página final está em HTTP.', https ? undefined : 'Use HTTPS e redirecione todo acesso HTTP para HTTPS.', 3, !https));

  const csp = headers.get('content-security-policy');
  const cspReportOnly = headers.get('content-security-policy-report-only');
  if (!csp) {
    items.push(item('csp', 'Content-Security-Policy', 'fail', 'Content-Security-Policy não encontrado.', 'Defina uma CSP compatível com a aplicação para reduzir o impacto de XSS e carregamentos indevidos.', 3));
  } else {
    const broadWildcard = /(?:^|;)\s*(?:default-src|script-src|style-src|img-src|connect-src)\s+[^;]*\*/i.test(csp);
    const severity = /'unsafe-eval'/i.test(csp) || broadWildcard ? 'warning' : 'pass';
    items.push(item('csp', 'Content-Security-Policy', severity, severity === 'pass' ? 'CSP presente sem wildcard amplo/unsafe-eval óbvios.' : 'CSP presente, mas contém permissões amplas que merecem revisão.', severity === 'pass' ? undefined : 'Restrinja origens e evite unsafe-eval/wildcards em diretivas sensíveis.', 3));
  }

  const directives = parseCsp(csp ?? '');
  const scriptSrc = directives.get('script-src') ?? directives.get('default-src') ?? '';
  items.push(item('csp-default-src', 'CSP default-src', !csp ? 'info' : directives.has('default-src') ? 'pass' : 'warning', !csp ? 'Sem CSP para avaliar.' : directives.has('default-src') ? `default-src ${directives.get('default-src')}` : 'CSP sem default-src.', csp && !directives.has('default-src') ? 'Defina default-src como base restritiva e abra exceções explicitamente.' : undefined, 2));
  items.push(item('csp-object-src', 'CSP object-src', !csp ? 'info' : /(?:^|\s)'none'(?:\s|$)/i.test(directives.get('object-src') ?? '') ? 'pass' : 'warning', !csp ? 'Sem CSP para avaliar.' : directives.has('object-src') ? `object-src ${directives.get('object-src')}` : 'object-src não definido.', csp && !/(?:^|\s)'none'(?:\s|$)/i.test(directives.get('object-src') ?? '') ? 'Considere object-src \'none\' se plugins legados não forem necessários.' : undefined));
  items.push(item('csp-base-uri', 'CSP base-uri', !csp ? 'info' : directives.has('base-uri') ? 'pass' : 'warning', !csp ? 'Sem CSP para avaliar.' : directives.has('base-uri') ? `base-uri ${directives.get('base-uri')}` : 'base-uri não definido.', csp && !directives.has('base-uri') ? 'Considere restringir base-uri para reduzir abuso do elemento <base>.' : undefined));
  items.push(item('csp-form-action', 'CSP form-action', !csp ? 'info' : directives.has('form-action') ? 'pass' : 'info', !csp ? 'Sem CSP para avaliar.' : directives.has('form-action') ? `form-action ${directives.get('form-action')}` : 'form-action não definido.', csp && !directives.has('form-action') ? 'Em aplicações com formulários sensíveis, restrinja destinos com form-action.' : undefined));
  items.push(item('csp-frame-ancestors', 'CSP frame-ancestors', !csp ? 'info' : directives.has('frame-ancestors') ? 'pass' : 'info', !csp ? 'Sem CSP para avaliar.' : directives.has('frame-ancestors') ? `frame-ancestors ${directives.get('frame-ancestors')}` : 'frame-ancestors não definido.'));
  items.push(item('csp-unsafe-inline', 'CSP unsafe-inline', !csp ? 'info' : /'unsafe-inline'/i.test(scriptSrc) ? 'warning' : 'pass', !csp ? 'Sem CSP para avaliar.' : /'unsafe-inline'/i.test(scriptSrc) ? 'script-src/default-src permite unsafe-inline.' : 'unsafe-inline não detectado em script-src/default-src.', /'unsafe-inline'/i.test(scriptSrc) ? 'Prefira nonces/hashes ou uma estratégia CSP compatível sem scripts inline livres.' : undefined, 2));
  items.push(item('csp-unsafe-eval', 'CSP unsafe-eval', !csp ? 'info' : /'unsafe-eval'/i.test(scriptSrc) ? 'fail' : 'pass', !csp ? 'Sem CSP para avaliar.' : /'unsafe-eval'/i.test(scriptSrc) ? 'script-src/default-src permite unsafe-eval.' : 'unsafe-eval não detectado.', /'unsafe-eval'/i.test(scriptSrc) ? 'Remova unsafe-eval se a aplicação e dependências permitirem.' : undefined, 2));
  items.push(item('csp-report-only', 'CSP Report-Only', cspReportOnly ? 'info' : 'pass', cspReportOnly ? 'Content-Security-Policy-Report-Only também está configurado.' : 'Nenhuma política Report-Only adicional detectada.'));

  const hsts = headers.get('strict-transport-security');
  if (!https) {
    items.push(item('hsts', 'Strict-Transport-Security', 'info', 'HSTS só é aplicável após HTTPS estar corretamente configurado.', undefined, 2));
  } else if (!hsts) {
    items.push(item('hsts', 'Strict-Transport-Security', 'warning', 'HSTS não encontrado.', 'Depois de validar HTTPS em todo o domínio, considere HSTS.', 2));
  } else {
    const maxAge = Number(hsts.match(/max-age\s*=\s*(\d+)/i)?.[1] ?? 0);
    items.push(item('hsts', 'Strict-Transport-Security', maxAge >= 15_552_000 ? 'pass' : 'warning', `HSTS presente${maxAge ? ` com max-age=${maxAge}` : ''}.`, maxAge >= 15_552_000 ? undefined : 'Considere um max-age de pelo menos 180 dias quando a implantação estiver madura.', 2));
  }
  items.push(item('hsts-subdomains', 'HSTS includeSubDomains', !hsts ? 'info' : /includeSubDomains/i.test(hsts) ? 'pass' : 'info', !hsts ? 'Sem HSTS para avaliar.' : /includeSubDomains/i.test(hsts) ? 'includeSubDomains habilitado.' : 'includeSubDomains não habilitado.', hsts && !/includeSubDomains/i.test(hsts) ? 'Ative somente quando todos os subdomínios estiverem prontos para HTTPS obrigatório.' : undefined));
  items.push(item('hsts-preload', 'HSTS preload', !hsts ? 'info' : /\bpreload\b/i.test(hsts) ? 'pass' : 'info', !hsts ? 'Sem HSTS para avaliar.' : /\bpreload\b/i.test(hsts) ? 'Diretiva preload presente.' : 'Diretiva preload não presente; isso é opcional e exige preparação cuidadosa.'));

  const nosniff = (headers.get('x-content-type-options') ?? '').toLowerCase() === 'nosniff';
  items.push(item('nosniff', 'X-Content-Type-Options', nosniff ? 'pass' : 'warning', nosniff ? 'X-Content-Type-Options: nosniff presente.' : 'nosniff não foi confirmado.', nosniff ? undefined : 'Use X-Content-Type-Options: nosniff.', 2));

  const referrer = (headers.get('referrer-policy') ?? '').toLowerCase();
  const unsafeReferrer = ['unsafe-url', 'no-referrer-when-downgrade'].includes(referrer);
  items.push(item('referrer-policy', 'Referrer-Policy', referrer ? unsafeReferrer ? 'warning' : 'pass' : 'warning', referrer ? `Referrer-Policy: ${referrer}` : 'Referrer-Policy não encontrado.', referrer ? unsafeReferrer ? 'Prefira strict-origin-when-cross-origin, no-referrer ou política adequada ao produto.' : undefined : 'Defina uma política como strict-origin-when-cross-origin.', 1));

  const permissions = headers.get('permissions-policy');
  items.push(item('permissions-policy', 'Permissions-Policy', permissions ? 'pass' : 'warning', permissions ? `Permissions-Policy presente: ${permissions}` : 'Permissions-Policy não encontrado.', permissions ? undefined : 'Restrinja recursos do navegador que a aplicação não utiliza.', 1));

  const xfo = headers.get('x-frame-options');
  const frameAncestors = /(?:^|;)\s*frame-ancestors\b/i.test(csp ?? '');
  items.push(item('clickjacking', 'Proteção contra clickjacking', xfo || frameAncestors ? 'pass' : 'warning', xfo ? `X-Frame-Options: ${xfo}` : frameAncestors ? 'CSP frame-ancestors presente.' : 'Nenhuma proteção explícita contra framing foi detectada.', xfo || frameAncestors ? undefined : 'Use CSP frame-ancestors ou X-Frame-Options conforme a compatibilidade necessária.', 2));

  const server = headers.get('server');
  items.push(item('server-header', 'Exposição do servidor', server ? 'info' : 'pass', server ? `Header Server exposto: ${server}` : 'Header Server não exposto.', server ? 'Evite expor versões detalhadas de infraestrutura.' : undefined));
  const poweredBy = headers.get('x-powered-by');
  items.push(item('x-powered-by', 'X-Powered-By', poweredBy ? 'warning' : 'pass', poweredBy ? `Tecnologia exposta: ${poweredBy}` : 'X-Powered-By não encontrado.', poweredBy ? 'Considere remover esse header em produção.' : undefined, 1));

  const cookies = getSetCookies(headers);
  if (!cookies.length) {
    items.push(item('cookies', 'Atributos de cookies', 'info', 'Nenhum Set-Cookie foi observado na resposta principal.'));
  } else {
    const insecure = cookies.filter((cookie) => https && !/;\s*secure(?:;|$)/i.test(cookie)).length;
    const noHttpOnly = cookies.filter((cookie) => !/;\s*httponly(?:;|$)/i.test(cookie)).length;
    const noSameSite = cookies.filter((cookie) => !/;\s*samesite=/i.test(cookie)).length;
    const severity = insecure ? 'fail' : (noHttpOnly || noSameSite ? 'warning' : 'pass');
    items.push(item('cookies', 'Atributos de cookies', severity, `${cookies.length} cookie(s): ${insecure} sem Secure, ${noHttpOnly} sem HttpOnly e ${noSameSite} sem SameSite.`, severity === 'pass' ? undefined : 'Revise atributos Secure, HttpOnly e SameSite conforme a finalidade de cada cookie.', 2));
  }
  const sameSiteNoneNoSecure = cookies.filter((cookie) => /;\s*samesite\s*=\s*none/i.test(cookie) && !/;\s*secure(?:;|$)/i.test(cookie)).length;
  items.push(item('cookie-samesite-none', 'SameSite=None exige Secure', sameSiteNoneNoSecure === 0 ? 'pass' : 'fail', `${sameSiteNoneNoSecure} cookie(s) SameSite=None sem Secure.`, sameSiteNoneNoSecure ? 'Adicione Secure a cookies SameSite=None.' : undefined, 2));
  const badHostPrefix = cookies.filter((cookie) => /^__Host-/i.test(cookie) && (!/;\s*secure(?:;|$)/i.test(cookie) || /;\s*domain=/i.test(cookie) || !/;\s*path=\//i.test(cookie))).length;
  const badSecurePrefix = cookies.filter((cookie) => /^__Secure-/i.test(cookie) && !/;\s*secure(?:;|$)/i.test(cookie)).length;
  items.push(item('cookie-prefix', 'Prefixos de cookie', badHostPrefix + badSecurePrefix === 0 ? 'pass' : 'warning', `${badHostPrefix + badSecurePrefix} cookie(s) com prefixo __Host-/__Secure- parecem inconsistentes com seus requisitos.`, badHostPrefix + badSecurePrefix ? 'Revise Secure, Path=/ e ausência de Domain conforme o prefixo.' : undefined));
  const wideDomainCookies = cookies.filter((cookie) => /;\s*domain\s*=\s*\.?[^;]+/i.test(cookie)).length;
  items.push(item('cookie-domain', 'Escopo Domain de cookies', wideDomainCookies ? 'info' : 'pass', wideDomainCookies ? `${wideDomainCookies} cookie(s) definem Domain explicitamente.` : 'Nenhum Domain explícito observado nos cookies.', wideDomainCookies ? 'Use escopo de domínio mínimo necessário para reduzir compartilhamento entre subdomínios.' : undefined));

  const acao = headers.get('access-control-allow-origin');
  const acac = (headers.get('access-control-allow-credentials') ?? '').toLowerCase() === 'true';
  items.push(item('cors-wildcard', 'CORS wildcard', acao === '*' ? acac ? 'fail' : 'info' : 'pass', acao ? `Access-Control-Allow-Origin: ${acao}${acac ? ' com credentials=true' : ''}.` : 'Nenhum ACAO observado na resposta principal.', acao === '*' && acac ? 'Não combine origem wildcard com credenciais; configure origens permitidas explicitamente.' : undefined, 2));

  const coop = headers.get('cross-origin-opener-policy');
  const coep = headers.get('cross-origin-embedder-policy');
  const corp = headers.get('cross-origin-resource-policy');
  items.push(item('coop', 'Cross-Origin-Opener-Policy', coop ? 'pass' : 'info', coop ? `COOP: ${coop}` : 'COOP não definido; isso pode ser aceitável dependendo da aplicação.'));
  items.push(item('coep', 'Cross-Origin-Embedder-Policy', coep ? 'pass' : 'info', coep ? `COEP: ${coep}` : 'COEP não definido; necessário apenas para alguns cenários de isolamento cross-origin.'));
  items.push(item('corp', 'Cross-Origin-Resource-Policy', corp ? 'pass' : 'info', corp ? `CORP: ${corp}` : 'CORP não definido na resposta principal.'));
  const oac = headers.get('origin-agent-cluster');
  items.push(item('origin-agent-cluster', 'Origin-Agent-Cluster', oac ? 'pass' : 'info', oac ? `Origin-Agent-Cluster: ${oac}` : 'Origin-Agent-Cluster não definido.'));
  const reporting = headers.get('reporting-endpoints') || headers.get('report-to');
  items.push(item('reporting-endpoints', 'Reporting API', reporting ? 'pass' : 'info', reporting ? 'Endpoint de relatórios de segurança/browser configurado.' : 'Reporting-Endpoints/Report-To não detectado.'));
  const xpcdp = headers.get('x-permitted-cross-domain-policies');
  items.push(item('cross-domain-policy', 'Política cross-domain legada', xpcdp ? 'pass' : 'info', xpcdp ? `X-Permitted-Cross-Domain-Policies: ${xpcdp}` : 'Header legado de cross-domain policies não definido.'));

  if (html) {
    const resources = auditResources(html, url.toString());
    items.push(item('mixed-content', 'Conteúdo misto', !https ? 'info' : resources.mixedContent === 0 ? 'pass' : 'fail', !https ? 'A checagem de mixed content se aplica a páginas HTTPS.' : resources.mixedContent === 0 ? 'Nenhum recurso HTTP foi detectado dentro da página HTTPS.' : `${resources.mixedContent} recurso(s) HTTP dentro de uma página HTTPS.`, resources.mixedContent ? 'Troque recursos HTTP por HTTPS.' : undefined, 3));

    const forms = findForms(html, url.toString());
    const insecureForms = forms.filter((form) => /^http:\/\//i.test(form.action ?? '') && https).length;
    const externalForms = forms.filter((form) => {
      try { return new URL(form.action ?? url.toString()).origin !== url.origin; } catch { return false; }
    }).length;
    items.push(item('insecure-forms', 'Envio de formulários', !https ? 'info' : insecureForms === 0 ? 'pass' : 'fail', !https ? 'A página principal já está em HTTP; migre primeiro o site para HTTPS.' : insecureForms === 0 ? 'Nenhum formulário enviando dados para HTTP foi detectado.' : `${insecureForms} formulário(s) envia(m) dados para HTTP.`, insecureForms ? 'Envie formulários somente para endpoints HTTPS.' : undefined, 3, https && insecureForms > 0));
    items.push(item('external-forms', 'Formulários cross-origin', externalForms === 0 ? 'pass' : 'info', `${externalForms} formulário(s) enviam dados para outra origem.`, externalForms ? 'Confirme se destinos externos são necessários e confiáveis.' : undefined));

    const httpLinks = findTags(html, 'a').map(parseAttributes).filter((a) => /^http:\/\//i.test(a.href ?? '')).length;
    items.push(item('http-links', 'Links HTTP explícitos', !https || httpLinks === 0 ? 'pass' : 'warning', `${httpLinks} link(s) HTTP explícito(s) encontrados em página HTTPS.`, https && httpLinks ? 'Atualize destinos para HTTPS quando disponível.' : undefined));

    const iframes = findTags(html, 'iframe').map(parseAttributes);
    const externalIframes = iframes.filter((a) => {
      try { return a.src && new URL(a.src, url).origin !== url.origin; } catch { return false; }
    });
    const unsandboxedExternal = externalIframes.filter((a) => !Object.hasOwn(a, 'sandbox')).length;
    const riskySandbox = iframes.filter((a) => /allow-scripts/i.test(a.sandbox ?? '') && /allow-same-origin/i.test(a.sandbox ?? '')).length;
    items.push(item('iframe-sandbox', 'Sandbox de iframes externos', unsandboxedExternal === 0 ? 'pass' : 'info', `${unsandboxedExternal} de ${externalIframes.length} iframe(s) externo(s) sem sandbox.`, unsandboxedExternal ? 'Aplique sandbox quando o conteúdo incorporado puder funcionar com restrições.' : undefined));
    items.push(item('iframe-sandbox-risk', 'Combinação de sandbox permissiva', riskySandbox === 0 ? 'pass' : 'warning', `${riskySandbox} iframe(s) combinam allow-scripts e allow-same-origin.`, riskySandbox ? 'Essa combinação reduz bastante o isolamento; confirme se é indispensável.' : undefined, 2));
  }

  const cacheControl = headers.get('cache-control') ?? '';
  const sensitiveCookie = cookies.some((c) => /session|auth|token|sid=/i.test(c));
  const publicCacheSensitive = sensitiveCookie && /\bpublic\b/i.test(cacheControl) && !/\bno-store\b/i.test(cacheControl);
  items.push(item('sensitive-cache', 'Cache de respostas com sessão', publicCacheSensitive ? 'warning' : 'pass', publicCacheSensitive ? `Resposta parece definir cookie sensível e usa Cache-Control público: ${cacheControl}` : 'Nenhuma combinação óbvia de cookie de sessão + cache público detectada.', publicCacheSensitive ? 'Revise cache de páginas autenticadas e dados personalizados.' : undefined, 2));

  return items;
}

function parseCsp(value) {
  const map = new Map();
  for (const part of String(value).split(';')) {
    const [name, ...rest] = part.trim().split(/\s+/);
    if (name) map.set(name.toLowerCase(), rest.join(' '));
  }
  return map;
}

function getSetCookies(headers) {
  if (typeof headers.getSetCookie === 'function') return headers.getSetCookie();
  const value = headers.get('set-cookie');
  return value ? [value] : [];
}

function item(id, title, severity, message, recommendation, weight = 1, critical = false) {
  return { category: 'Segurança', id, title, severity, message, recommendation, weight, critical };
}
