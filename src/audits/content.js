import { findPairedTags, findTags, parseAttributes, stripTags } from '../utils/html.js';

export function auditContent(html, pageUrl) {
  const text = stripTags(html);
  const words = text.split(/\s+/).filter(Boolean);
  const headings = [...html.matchAll(/<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi)].map((m) => stripTags(m[2]));
  const paragraphs = findPairedTags(html, 'p');
  const anchors = findPairedTags(html, 'a');
  const ids = collectIds(html);
  const duplicateIds = duplicateValues(ids);
  const genericAnchors = anchors.filter(({ text: value }) => /^(clique aqui|saiba mais|aqui|click here|read more|more)$/i.test(value.trim())).length;
  const emptyParagraphs = paragraphs.filter(({ text: value }) => !value.trim()).length;
  const longParagraphs = paragraphs.filter(({ text: value }) => value.split(/\s+/).filter(Boolean).length > 180).length;
  const veryLongHeadings = headings.filter((value) => value.length > 100).length;
  const emptyHeadings = headings.filter((value) => !value).length;
  const replacementChars = (text.match(/�/g) ?? []).length;
  const lorem = /\blorem ipsum\b/i.test(text);
  const placeholders = /\b(?:todo|fixme|coming soon|under construction|em constru[cç][aã]o|em breve)\b/i.test(text);
  const repeatedWhitespace = (html.match(/(?:&nbsp;\s*){4,}/gi) ?? []).length;
  const textBytes = Buffer.byteLength(text, 'utf8');
  const htmlBytes = Math.max(1, Buffer.byteLength(html, 'utf8'));
  const textRatio = textBytes / htmlBytes;
  const urls = anchors.map(({ attrs }) => attrs.href).filter(Boolean);
  const fragmentOnly = urls.filter((href) => /^#/.test(href)).length;
  const current = new URL(pageUrl);
  const longUrls = urls.filter((href) => {
    try { return new URL(href, current).toString().length > 180; } catch { return false; }
  }).length;

  return [
    content('word-count', 'Quantidade de conteúdo textual', words.length >= 80 ? 'pass' : words.length >= 25 ? 'info' : 'warning', `${words.length} palavra(s) de texto visível aproximado.`, words.length < 25 ? 'Confirme se a página entrega conteúdo suficiente para sua finalidade.' : undefined, 1),
    content('text-ratio', 'Relação texto/HTML', textRatio >= 0.08 ? 'pass' : 'info', `Texto visível representa aproximadamente ${(textRatio * 100).toFixed(1)}% do HTML.`, textRatio < 0.04 ? 'Markup muito grande para pouco conteúdo pode indicar excesso de estrutura ou scripts inline.' : undefined),
    content('lorem-ipsum', 'Lorem ipsum', lorem ? 'fail' : 'pass', lorem ? 'Texto Lorem Ipsum foi detectado.' : 'Nenhum Lorem Ipsum detectado.', lorem ? 'Substitua conteúdo de preenchimento antes de publicar.' : undefined, 3),
    content('placeholder-copy', 'Textos provisórios', placeholders ? 'warning' : 'pass', placeholders ? 'Foram encontrados sinais de conteúdo provisório (TODO/FIXME/em breve/em construção).' : 'Nenhum marcador comum de conteúdo provisório detectado.', placeholders ? 'Revise o conteúdo publicado e remova placeholders acidentais.' : undefined, 2),
    content('replacement-char', 'Caracteres de substituição', replacementChars === 0 ? 'pass' : 'warning', `${replacementChars} caractere(s) � detectado(s).`, replacementChars ? 'Revise encoding e textos corrompidos.' : undefined, 2),
    content('empty-headings', 'Headings vazios', emptyHeadings === 0 ? 'pass' : 'warning', `${emptyHeadings} heading(s) vazio(s).`, emptyHeadings ? 'Remova headings vazios ou forneça texto semântico.' : undefined, 2),
    content('long-headings', 'Headings excessivamente longos', veryLongHeadings === 0 ? 'pass' : 'info', `${veryLongHeadings} heading(s) acima de 100 caracteres.`, veryLongHeadings ? 'Considere títulos mais escaneáveis.' : undefined),
    content('empty-paragraphs', 'Parágrafos vazios', emptyParagraphs === 0 ? 'pass' : 'info', `${emptyParagraphs} parágrafo(s) vazio(s).`, emptyParagraphs ? 'Use CSS para espaçamento em vez de parágrafos vazios.' : undefined),
    content('long-paragraphs', 'Parágrafos muito longos', longParagraphs === 0 ? 'pass' : 'info', `${longParagraphs} parágrafo(s) com mais de 180 palavras.`, longParagraphs ? 'Quebre blocos longos quando isso melhorar a leitura.' : undefined),
    content('generic-anchor-text', 'Textos genéricos de link', genericAnchors === 0 ? 'pass' : 'warning', `${genericAnchors} link(s) com texto genérico como “clique aqui/saiba mais”.`, genericAnchors ? 'Prefira textos que descrevam o destino do link.' : undefined, 1),
    content('duplicate-ids', 'IDs duplicados', duplicateIds.length === 0 ? 'pass' : 'fail', duplicateIds.length ? `${duplicateIds.length} valor(es) de id duplicado(s): ${duplicateIds.slice(0, 5).join(', ')}${duplicateIds.length > 5 ? '…' : ''}` : 'Nenhum id duplicado detectado.', duplicateIds.length ? 'IDs devem ser únicos por documento para navegação, labels e ARIA funcionarem de forma previsível.' : undefined, 3),
    content('fragment-links', 'Links somente para fragmentos', fragmentOnly <= 8 ? 'pass' : 'info', `${fragmentOnly} link(s) usam apenas fragmentos (#...).`, fragmentOnly > 8 ? 'Confirme que todos os destinos por id existem e que a navegação interna é intencional.' : undefined),
    content('long-links', 'URLs muito longas', longUrls === 0 ? 'pass' : 'info', `${longUrls} link(s) resolvem para URLs acima de 180 caracteres.`, longUrls ? 'URLs muito longas podem ser difíceis de compartilhar e depurar.' : undefined),
    content('nonempty-body', 'Conteúdo principal não vazio', words.length > 0 ? 'pass' : 'fail', words.length ? 'A página possui conteúdo textual visível.' : 'Nenhum conteúdo textual visível foi encontrado.', words.length ? undefined : 'Confirme se o HTML principal foi renderizado corretamente ou se depende totalmente de JavaScript.', 3),
    content('title-like-placeholder', 'Título provisório no conteúdo', /\b(?:untitled|document|new page|sem t[ií]tulo)\b/i.test(text.slice(0, 500)) ? 'warning' : 'pass', /\b(?:untitled|document|new page|sem t[ií]tulo)\b/i.test(text.slice(0, 500)) ? 'O início do conteúdo contém texto que parece título provisório.' : 'Nenhum título provisório comum detectado no início da página.')
  ];
}

function collectIds(html) {
  const tags = html.match(/<[a-z][^>]*>/gi) ?? [];
  return tags.map((tag) => parseAttributes(tag).id).filter(Boolean);
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates];
}

function content(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'Conteúdo', id: `content-${id}`, title, severity, message, recommendation, weight };
}
