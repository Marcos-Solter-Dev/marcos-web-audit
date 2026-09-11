import { findLinksByRel, findMetaContent } from '../utils/html.js';
import { fetchText } from '../utils/request.js';

export async function auditPwa(html, pageUrl, timeoutMs = 6000) {
  const manifestLink = findLinksByRel(html, 'manifest')[0];
  const themeColor = findMetaContent(html, 'theme-color');
  const appleCapable = findMetaContent(html, 'apple-mobile-web-app-capable');
  const mobileCapable = findMetaContent(html, 'mobile-web-app-capable');
  const serviceWorkerSignal = /navigator\s*\.\s*serviceWorker|serviceWorker\s*\.\s*register\s*\(/i.test(html);
  const appleIcon = findLinksByRel(html, 'apple-touch-icon')[0];
  const maskIcon = findLinksByRel(html, 'mask-icon')[0];

  let manifest = null;
  let manifestUrl;
  let manifestError;
  if (manifestLink?.href) {
    try {
      manifestUrl = new URL(manifestLink.href, pageUrl).toString();
      const result = await fetchText(manifestUrl, { timeoutMs, retries: 1, accept: 'application/manifest+json,application/json,*/*;q=0.5' });
      if (!result.response.ok) {
        manifestError = `HTTP ${result.response.status}`;
      } else {
        manifest = JSON.parse(result.text.replace(/^\uFEFF/, ''));
      }
    } catch (error) {
      manifestError = error instanceof Error ? error.message : String(error);
    }
  }

  const icons = Array.isArray(manifest?.icons) ? manifest.icons : [];
  const sizes = icons.flatMap((icon) => String(icon?.sizes ?? '').split(/\s+/)).filter(Boolean);
  const has192 = sizes.some((size) => /^192x192$/i.test(size) || size === 'any');
  const has512 = sizes.some((size) => /^512x512$/i.test(size) || size === 'any');
  const purposeMaskable = icons.some((icon) => /(?:^|\s)maskable(?:\s|$)/i.test(String(icon?.purpose ?? '')));

  const items = [
    pwa('manifest-link', 'Web App Manifest', manifestLink ? 'pass' : 'info', manifestLink ? `Manifest declarado${manifestUrl ? `: ${manifestUrl}` : '.'}` : 'Nenhum <link rel="manifest"> foi encontrado.', manifestLink ? undefined : 'Se o site pretende funcionar como PWA, adicione um Web App Manifest.'),
    pwa('manifest-fetch', 'Manifest acessível', !manifestLink ? 'info' : manifest ? 'pass' : 'warning', !manifestLink ? 'Sem manifest para validar.' : manifest ? 'Manifest carregado e JSON válido.' : `Não foi possível validar o manifest${manifestError ? `: ${manifestError}` : '.'}`, manifestLink && !manifest ? 'Corrija o caminho, status HTTP e JSON do manifest.' : undefined, 2),
    pwa('name', 'Nome da aplicação', !manifest ? 'info' : manifest.name ? 'pass' : 'warning', manifest?.name ? `name: ${manifest.name}` : 'Manifest sem campo name.', manifest && !manifest.name ? 'Defina name para identificar a aplicação.' : undefined),
    pwa('short-name', 'Nome curto', !manifest ? 'info' : manifest.short_name ? 'pass' : 'info', manifest?.short_name ? `short_name: ${manifest.short_name}` : 'Manifest sem short_name.'),
    pwa('start-url', 'start_url', !manifest ? 'info' : manifest.start_url ? 'pass' : 'warning', manifest?.start_url ? `start_url: ${manifest.start_url}` : 'Manifest sem start_url.', manifest && !manifest.start_url ? 'Defina start_url quando o site for instalável.' : undefined),
    pwa('scope', 'Scope da PWA', !manifest ? 'info' : manifest.scope ? 'pass' : 'info', manifest?.scope ? `scope: ${manifest.scope}` : 'Scope não definido explicitamente.'),
    pwa('display', 'Modo de exibição', !manifest ? 'info' : manifest.display ? 'pass' : 'warning', manifest?.display ? `display: ${manifest.display}` : 'Manifest sem display.', manifest && !manifest.display ? 'Defina display (por exemplo standalone) conforme a experiência desejada.' : undefined),
    pwa('theme-color-manifest', 'theme_color no manifest', !manifest ? 'info' : manifest.theme_color ? 'pass' : 'info', manifest?.theme_color ? `theme_color: ${manifest.theme_color}` : 'theme_color não definido no manifest.'),
    pwa('background-color', 'background_color', !manifest ? 'info' : manifest.background_color ? 'pass' : 'info', manifest?.background_color ? `background_color: ${manifest.background_color}` : 'background_color não definido no manifest.'),
    pwa('icon-192', 'Ícone 192×192', !manifest ? 'info' : has192 ? 'pass' : 'warning', has192 ? 'Ícone 192×192 (ou any) declarado.' : 'Nenhum ícone 192×192 foi detectado.', manifest && !has192 ? 'Adicione um ícone adequado para instalação.' : undefined),
    pwa('icon-512', 'Ícone 512×512', !manifest ? 'info' : has512 ? 'pass' : 'warning', has512 ? 'Ícone 512×512 (ou any) declarado.' : 'Nenhum ícone 512×512 foi detectado.', manifest && !has512 ? 'Adicione um ícone 512×512 para experiências de instalação.' : undefined),
    pwa('maskable-icon', 'Ícone maskable', !manifest ? 'info' : purposeMaskable ? 'pass' : 'info', purposeMaskable ? 'Há ícone com purpose="maskable".' : 'Nenhum ícone maskable detectado.'),
    pwa('theme-color-meta', 'Meta theme-color', themeColor ? 'pass' : 'info', themeColor ? `theme-color: ${themeColor}` : 'Meta theme-color não encontrado.'),
    pwa('service-worker', 'Sinal de Service Worker', serviceWorkerSignal ? 'pass' : 'info', serviceWorkerSignal ? 'Foi detectado código relacionado a Service Worker no HTML.' : 'Nenhum registro de Service Worker foi detectado no HTML estático.', serviceWorkerSignal ? undefined : 'Se o projeto for uma PWA, registre um Service Worker; bundlers podem ocultar esse sinal do HTML.'),
    pwa('apple-touch-icon', 'Apple touch icon', appleIcon ? 'pass' : 'info', appleIcon?.href ? `apple-touch-icon: ${appleIcon.href}` : 'apple-touch-icon não declarado.'),
    pwa('mask-icon', 'Mask icon', maskIcon ? 'pass' : 'info', maskIcon?.href ? `mask-icon: ${maskIcon.href}` : 'mask-icon não declarado.'),
    pwa('mobile-capable', 'Metadados de modo app', appleCapable || mobileCapable ? 'pass' : 'info', appleCapable || mobileCapable ? 'Metadados mobile-web-app-capable detectados.' : 'Metadados mobile-web-app-capable não encontrados; podem ser desnecessários em PWAs modernas.'),
    pwa('manifest-id', 'ID do manifest', !manifest ? 'info' : manifest.id ? 'pass' : 'info', manifest?.id ? `id: ${manifest.id}` : 'Manifest sem id explícito.')
  ];

  return { items, manifest: manifest ? compactManifest(manifest, manifestUrl) : manifestUrl ? { url: manifestUrl, error: manifestError } : null };
}

function compactManifest(manifest, url) {
  return {
    url,
    name: manifest.name,
    short_name: manifest.short_name,
    id: manifest.id,
    start_url: manifest.start_url,
    scope: manifest.scope,
    display: manifest.display,
    theme_color: manifest.theme_color,
    background_color: manifest.background_color,
    icons: Array.isArray(manifest.icons) ? manifest.icons.slice(0, 20) : []
  };
}

function pwa(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'PWA', id: `pwa-${id}`, title, severity, message, recommendation, weight };
}
