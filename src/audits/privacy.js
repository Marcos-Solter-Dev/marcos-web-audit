import { findPairedTags, findTags, parseAttributes } from '../utils/html.js';

const TRACKERS = [
  ['Google Analytics', /google-analytics\.com|googletagmanager\.com\/gtag|gtag\s*\(/i],
  ['Google Tag Manager', /googletagmanager\.com\/gtm\.js|GTM-[A-Z0-9]+/i],
  ['Meta Pixel', /connect\.facebook\.net|fbq\s*\(/i],
  ['Microsoft Clarity', /clarity\.ms|clarity\s*\(/i],
  ['Hotjar', /hotjar\.com|hj\s*\(/i],
  ['TikTok Pixel', /analytics\.tiktok\.com|ttq\s*\./i],
  ['LinkedIn Insight', /snap\.licdn\.com|_linkedin_partner_id/i]
];

export function auditPrivacy(html, pageUrl, headers) {
  const origin = new URL(pageUrl).origin;
  const scripts = findTags(html, 'script').map(parseAttributes).filter((x) => x.src);
  const iframes = findTags(html, 'iframe').map(parseAttributes).filter((x) => x.src);
  const forms = findTags(html, 'form').map(parseAttributes);
  const images = findTags(html, 'img').map(parseAttributes).filter((x) => x.src);
  const anchors = findPairedTags(html, 'a');

  const externalScripts = scripts.filter((attrs) => isThirdParty(attrs.src, origin, pageUrl));
  const externalIframes = iframes.filter((attrs) => isThirdParty(attrs.src, origin, pageUrl));
  const externalForms = forms.filter((attrs) => attrs.action && isThirdParty(attrs.action, origin, pageUrl));
  const externalImages = images.filter((attrs) => isThirdParty(attrs.src, origin, pageUrl));
  const tinyExternalImages = externalImages.filter((attrs) => Number(attrs.width) <= 2 && Number(attrs.height) <= 2).length;
  const trackers = TRACKERS.filter(([, regex]) => regex.test(html)).map(([name]) => name);
  const privacyLink = anchors.some(({ attrs, text }) => /privacidade|privacy/i.test(`${text} ${attrs.href ?? ''}`));
  const cookieLink = anchors.some(({ attrs, text }) => /cookie/i.test(`${text} ${attrs.href ?? ''}`));
  const sensitiveApiSignals = [
    ['geolocation', /navigator\.geolocation|geolocation\.getCurrentPosition/i],
    ['camera/microfone', /getUserMedia\s*\(|mediaDevices\.getUserMedia/i],
    ['clipboard', /navigator\.clipboard/i],
    ['notificações', /Notification\.requestPermission/i]
  ].filter(([, regex]) => regex.test(html)).map(([name]) => name);
  const pp = headers.get('permissions-policy') ?? '';
  const wildcardSensitive = /(camera|microphone|geolocation)\s*=\s*\*/i.test(pp);
  const referrer = (headers.get('referrer-policy') ?? '').toLowerCase();
  const permissiveReferrer = ['unsafe-url', 'no-referrer-when-downgrade'].includes(referrer);
  const passwordInputs = findTags(html, 'input').map(parseAttributes).filter((a) => (a.type ?? '').toLowerCase() === 'password');
  const passwordAutocompleteOff = passwordInputs.filter((a) => (a.autocomplete ?? '').toLowerCase() === 'off').length;

  return [
    privacy('third-party-scripts', 'Scripts de terceiros', externalScripts.length <= 5 ? 'pass' : externalScripts.length <= 12 ? 'info' : 'warning', `${externalScripts.length} script(s) de origem externa detectado(s).`, externalScripts.length > 12 ? 'Revise dependências de terceiros e mantenha somente as necessárias.' : undefined, 1),
    privacy('third-party-iframes', 'Iframes de terceiros', externalIframes.length <= 3 ? 'pass' : 'info', `${externalIframes.length} iframe(s) de terceiros detectado(s).`, externalIframes.length > 3 ? 'Revise embeds externos, permissões e impacto de privacidade.' : undefined),
    privacy('third-party-forms', 'Formulários para terceiros', externalForms.length === 0 ? 'pass' : 'warning', `${externalForms.length} formulário(s) enviam dados para outra origem.`, externalForms.length ? 'Confirme se o envio externo é esperado e documentado para o usuário.' : undefined, 2),
    privacy('tracker-signals', 'Sinais de analytics/tracking', trackers.length === 0 ? 'pass' : 'info', trackers.length ? `Detectado(s): ${trackers.join(', ')}.` : 'Nenhum tracker comum detectado por assinatura estática.', trackers.length ? 'Garanta que coleta, consentimento e política de privacidade estejam alinhados ao uso real.' : undefined),
    privacy('privacy-link', 'Link de política de privacidade', privacyLink ? 'pass' : trackers.length || externalForms.length ? 'warning' : 'info', privacyLink ? 'Foi encontrado link relacionado a privacidade.' : 'Nenhum link de política de privacidade foi detectado.', privacyLink ? undefined : 'Se o site coleta dados pessoais, considere uma política de privacidade clara.'),
    privacy('cookie-link', 'Informação sobre cookies', cookieLink ? 'pass' : trackers.length ? 'info' : 'pass', cookieLink ? 'Foi encontrado link/texto relacionado a cookies.' : trackers.length ? 'Trackers foram detectados, mas nenhum link explícito sobre cookies foi encontrado.' : 'Nenhum sinal óbvio exige aviso específico por esta heurística.'),
    privacy('sensitive-apis', 'APIs sensíveis do navegador', sensitiveApiSignals.length === 0 ? 'pass' : 'info', sensitiveApiSignals.length ? `Sinais de uso: ${sensitiveApiSignals.join(', ')}.` : 'Nenhum uso estático de geolocalização/câmera/microfone/clipboard/notificações detectado.'),
    privacy('permissions-wildcard', 'Permissions-Policy permissiva', wildcardSensitive ? 'warning' : 'pass', wildcardSensitive ? 'Permissions-Policy libera camera/microfone/geolocalização com wildcard.' : 'Nenhum wildcard para câmera/microfone/geolocalização foi detectado.', wildcardSensitive ? 'Restrinja recursos sensíveis às origens realmente necessárias.' : undefined, 2),
    privacy('referrer-policy', 'Privacidade de Referer', permissiveReferrer ? 'warning' : referrer ? 'pass' : 'info', referrer ? `Referrer-Policy: ${referrer}` : 'Referrer-Policy ausente.', permissiveReferrer ? 'Prefira uma política que limite dados enviados entre origens, como strict-origin-when-cross-origin.' : undefined),
    privacy('external-images', 'Imagens de terceiros', externalImages.length <= 8 ? 'pass' : 'info', `${externalImages.length} imagem(ns) de terceiros detectada(s).`, externalImages.length > 8 ? 'Recursos externos podem revelar requisições do visitante a terceiros.' : undefined),
    privacy('tracking-pixels', 'Pixels externos minúsculos', tinyExternalImages === 0 ? 'pass' : 'info', `${tinyExternalImages} imagem(ns) externa(s) com dimensões até 2×2 detectada(s).`, tinyExternalImages ? 'Confirme se são pixels de medição necessários e documentados.' : undefined),
    privacy('password-autocomplete', 'Autocomplete de senhas', passwordAutocompleteOff === 0 ? 'pass' : 'warning', passwordInputs.length ? `${passwordAutocompleteOff} de ${passwordInputs.length} campo(s) de senha usam autocomplete="off".` : 'Nenhum campo de senha encontrado.', passwordAutocompleteOff ? 'Evite bloquear gerenciadores de senha sem uma razão forte; use autocomplete adequado (current-password/new-password).' : undefined, 1)
  ];
}

function isThirdParty(value, origin, baseUrl) {
  try {
    const url = new URL(value, baseUrl);
    return ['http:', 'https:'].includes(url.protocol) && url.origin !== origin;
  } catch {
    return false;
  }
}

function privacy(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'Privacidade', id: `privacy-${id}`, title, severity, message, recommendation, weight };
}
