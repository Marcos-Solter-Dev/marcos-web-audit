export function auditHttp(response, html = '') {
  const headers = response.headers;
  const status = Number(response.status || 0);
  const contentType = headers.get('content-type') ?? '';
  const contentLanguage = headers.get('content-language');
  const etag = headers.get('etag');
  const lastModified = headers.get('last-modified');
  const cacheControl = headers.get('cache-control');
  const vary = headers.get('vary');
  const xRobots = headers.get('x-robots-tag');
  const contentLength = headers.get('content-length');
  const serverTiming = headers.get('server-timing');
  const altSvc = headers.get('alt-svc');
  const acceptRanges = headers.get('accept-ranges');
  const age = headers.get('age');
  const charset = contentType.match(/charset\s*=\s*([^;\s]+)/i)?.[1];

  const cacheValidator = Boolean(etag || lastModified);
  const noStore = /\bno-store\b/i.test(cacheControl ?? '');
  const htmlHasCharset = /<meta\b[^>]*(?:charset\s*=|http-equiv=["']?content-type)/i.test(html);

  return [
    http('status', 'Status HTTP principal', status >= 200 && status < 400 ? 'pass' : 'fail', `Resposta HTTP ${status || 'desconhecida'}.`, status >= 200 && status < 400 ? undefined : 'Corrija a resposta principal para um status de sucesso ou redirecionamento intencional.', 3, status >= 500),
    http('content-type', 'Content-Type HTML', /(?:text\/html|application\/xhtml\+xml)/i.test(contentType) ? 'pass' : 'fail', contentType ? `Content-Type: ${contentType}` : 'Content-Type ausente.', 'Sirva documentos HTML com Content-Type apropriado.', 2),
    http('charset-header', 'Charset no header HTTP', charset ? 'pass' : htmlHasCharset ? 'info' : 'warning', charset ? `Charset HTTP: ${charset}` : htmlHasCharset ? 'Charset não veio no header, mas existe no HTML.' : 'Charset não detectado no header nem no HTML.', charset || htmlHasCharset ? undefined : 'Declare UTF-8 no Content-Type ou em <meta charset="utf-8">.', 1),
    http('content-language', 'Content-Language', contentLanguage ? 'pass' : 'info', contentLanguage ? `Content-Language: ${contentLanguage}` : 'Content-Language não definido; o atributo lang do HTML continua sendo o principal sinal semântico.'),
    http('etag', 'ETag', etag ? 'pass' : noStore ? 'info' : 'info', etag ? `ETag presente: ${etag}` : noStore ? 'ETag ausente em uma resposta no-store.' : 'ETag não encontrado.'),
    http('last-modified', 'Last-Modified', lastModified ? 'pass' : 'info', lastModified ? `Last-Modified: ${lastModified}` : 'Last-Modified não encontrado.'),
    http('cache-validator', 'Validador de cache', cacheValidator || noStore ? 'pass' : 'info', cacheValidator ? 'A resposta possui ETag e/ou Last-Modified.' : noStore ? 'A resposta usa no-store, então revalidação pode não ser necessária.' : 'Nenhum ETag ou Last-Modified foi observado.', cacheValidator || noStore ? undefined : 'Para conteúdo cacheável, validadores podem reduzir transferências desnecessárias.'),
    http('vary', 'Header Vary', vary ? 'pass' : 'info', vary ? `Vary: ${vary}` : 'Vary não encontrado.'),
    http('x-robots-tag', 'X-Robots-Tag', /\bnoindex\b/i.test(xRobots ?? '') ? 'warning' : 'pass', xRobots ? `X-Robots-Tag: ${xRobots}` : 'Nenhum noindex via X-Robots-Tag foi detectado.', /\bnoindex\b/i.test(xRobots ?? '') ? 'Confirme se a remoção da página dos mecanismos de busca é intencional.' : undefined, 2),
    http('content-length', 'Content-Length', contentLength ? 'pass' : 'info', contentLength ? `Content-Length: ${contentLength} bytes.` : 'Content-Length não foi enviado (isso pode ser normal com streaming/chunked).'),
    http('server-timing', 'Server-Timing', serverTiming ? 'pass' : 'info', serverTiming ? 'Server-Timing disponível para diagnóstico de backend.' : 'Server-Timing não encontrado.', serverTiming ? undefined : 'Opcionalmente exponha métricas Server-Timing não sensíveis para observabilidade.'),
    http('alt-svc', 'HTTP/3 / Alt-Svc', altSvc ? 'pass' : 'info', altSvc ? `Alt-Svc: ${altSvc}` : 'Alt-Svc não observado; HTTP/3 pode estar disponível por outros mecanismos.'),
    http('accept-ranges', 'Accept-Ranges', acceptRanges ? 'pass' : 'info', acceptRanges ? `Accept-Ranges: ${acceptRanges}` : 'Accept-Ranges não informado.'),
    http('age', 'Idade de cache intermediário', age ? 'info' : 'pass', age ? `Age: ${age} segundo(s), indicando resposta servida/armazenada por cache intermediário.` : 'Header Age não presente na resposta principal.')
  ];
}

function http(id, title, severity, message, recommendation, weight = 1, critical = false) {
  return { category: 'HTTP', id: `http-${id}`, title, severity, message, recommendation, weight, critical };
}
