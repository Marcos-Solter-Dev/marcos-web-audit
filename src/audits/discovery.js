import { fetchText } from '../utils/request.js';

async function checkTextFile(url, timeoutMs, accept = 'text/plain,*/*;q=0.8') {
  try {
    const result = await fetchText(url, { timeoutMs, retries: 1, accept });
    return {
      url,
      status: result.response.status,
      exists: result.response.ok,
      text: result.response.ok ? result.text.slice(0, 200_000) : '',
      contentType: result.response.headers.get('content-type') ?? ''
    };
  } catch (error) {
    return { url, exists: false, error: error instanceof Error ? error.message : String(error) };
  }
}

export async function auditDiscovery(baseUrl, timeoutMs = 6000) {
  const origin = new URL(baseUrl).origin;
  const robotsUrl = new URL('/robots.txt', origin).toString();
  const sitemapUrl = new URL('/sitemap.xml', origin).toString();
  const securityTxtUrl = new URL('/.well-known/security.txt', origin).toString();

  const [robots, sitemap, securityTxt] = await Promise.all([
    checkTextFile(robotsUrl, timeoutMs),
    checkTextFile(sitemapUrl, timeoutMs, 'application/xml,text/xml,*/*;q=0.8'),
    checkTextFile(securityTxtUrl, timeoutMs)
  ]);

  const robotsHasSitemap = robots.exists && /^\s*Sitemap\s*:/im.test(robots.text ?? '');
  const sitemapLooksXml = sitemap.exists && /<(?:urlset|sitemapindex)\b/i.test(sitemap.text ?? '');
  const securityTxtValidish = securityTxt.exists && /(^|\n)Contact\s*:/i.test(securityTxt.text ?? '');

  return {
    items: [
      discover('robots', 'robots.txt', robots.exists ? 'pass' : 'info', robots.exists ? `robots.txt acessível em ${robotsUrl}` : `robots.txt não foi confirmado em ${robotsUrl}.`, robots.exists ? undefined : 'Publique robots.txt se precisar orientar crawlers.'),
      discover('robots-sitemap', 'Sitemap no robots.txt', robotsHasSitemap ? 'pass' : 'info', robotsHasSitemap ? 'robots.txt referencia um sitemap.' : 'Nenhuma diretiva Sitemap foi detectada no robots.txt.'),
      discover('sitemap', 'sitemap.xml', sitemapLooksXml ? 'pass' : sitemap.exists ? 'warning' : 'info', sitemapLooksXml ? 'Sitemap XML válido em estrutura básica.' : sitemap.exists ? 'sitemap.xml respondeu, mas a estrutura esperada não foi identificada.' : 'sitemap.xml não foi confirmado.', sitemap.exists && !sitemapLooksXml ? 'Verifique se o arquivo é um XML de sitemap válido.' : undefined, 2),
      discover('security-txt', 'security.txt', securityTxtValidish ? 'pass' : securityTxt.exists ? 'warning' : 'info', securityTxtValidish ? 'security.txt encontrado com campo Contact.' : securityTxt.exists ? 'security.txt existe, mas Contact não foi detectado.' : 'security.txt não encontrado.', securityTxtValidish ? undefined : 'Projetos públicos podem publicar /.well-known/security.txt com um canal de contato para vulnerabilidades.')
    ],
    robots: compact(robots),
    sitemap: compact(sitemap),
    securityTxt: compact(securityTxt)
  };
}

function compact(value) {
  const { text, ...rest } = value;
  return { ...rest, preview: text ? text.slice(0, 500) : undefined };
}

function discover(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'Descoberta', id, title, severity, message, recommendation, weight };
}
