import { auditHeadings, auditImages, auditInteractiveElements, findHtmlLang, findPairedTags, findTags, parseAttributes } from '../utils/html.js';

export function auditAccessibility(html) {
  const images = auditImages(html);
  const interactive = auditInteractiveElements(html);
  const headings = auditHeadings(html);
  const lang = findHtmlLang(html);
  const inputs = findTags(html, 'input').map(parseAttributes);
  const iframes = findTags(html, 'iframe').map(parseAttributes);
  const videos = findPairedTags(html, 'video');
  const audios = findPairedTags(html, 'audio');
  const tables = findPairedTags(html, 'table');
  const svgs = findPairedTags(html, 'svg');
  const allTags = html.match(/<[a-z][^>]*>/gi) ?? [];
  const attrs = allTags.map(parseAttributes);
  const ids = new Set(attrs.map((a) => a.id).filter(Boolean));
  const positiveTabindex = attrs.filter((a) => /^\d+$/.test(a.tabindex ?? '') && Number(a.tabindex) > 0).length;
  const autofocus = attrs.filter((a) => Object.hasOwn(a, 'autofocus')).length;
  const emptyAriaLabels = attrs.filter((a) => Object.hasOwn(a, 'aria-label') && !String(a['aria-label']).trim()).length;
  const brokenLabelledby = attrs.filter((a) => a['aria-labelledby'] && String(a['aria-labelledby']).split(/\s+/).some((id) => !ids.has(id))).length;
  const brokenDescribedby = attrs.filter((a) => a['aria-describedby'] && String(a['aria-describedby']).split(/\s+/).some((id) => !ids.has(id))).length;
  const iframeWithoutTitle = iframes.filter((a) => !a.title && !a['aria-label'] && !a['aria-labelledby']).length;
  const inputImageWithoutAlt = inputs.filter((a) => (a.type ?? '').toLowerCase() === 'image' && !a.alt).length;
  const filenameAlts = findTags(html, 'img').map(parseAttributes).filter((a) => /\.(?:png|jpe?g|gif|webp|svg)(?:$|\?)/i.test((a.alt ?? '').trim())).length;
  const tablesWithoutHeaders = tables.filter(({ inner }) => !/<th\b/i.test(inner)).length;
  const tablesWithoutCaption = tables.filter(({ inner }) => !/<caption\b/i.test(inner)).length;
  const svgWithoutName = svgs.filter(({ attrs: a, inner }) => !a['aria-label'] && !a['aria-labelledby'] && !/<title\b/i.test(inner) && (a.role ?? '').toLowerCase() !== 'presentation').length;
  const mediaWithoutCaptions = videos.filter(({ inner }) => !/<track\b[^>]*kind\s*=\s*["']captions["']/i.test(inner)).length;
  const audioWithoutControls = audios.filter(({ attrs: a }) => !Object.hasOwn(a, 'controls')).length;
  const skipLink = findPairedTags(html, 'a').some(({ attrs: a, text }) => /^#/.test(a.href ?? '') && /pular|skip|conte[uú]do|main/i.test(text));
  const mainCount = Math.max((html.match(/<main\b/gi) ?? []).length, (html.match(/\brole\s*=\s*["']main["']/gi) ?? []).length);
  const navCount = (html.match(/<nav\b/gi) ?? []).length;
  const invalidLang = lang ? !/^[a-z]{2,3}(?:-[A-Za-z0-9]{2,8})*$/i.test(lang) : false;
  const viewport = findViewport(html);
  const zoomBlocked = /user-scalable\s*=\s*no/i.test(viewport ?? '') || /maximum-scale\s*=\s*1(?:\.0+)?(?:\s*[,;]|$)/i.test(viewport ?? '');
  const marqueeBlink = (html.match(/<(?:marquee|blink)\b/gi) ?? []).length;
  const accessKeys = attrs.map((a) => a.accesskey).filter(Boolean);
  const duplicateAccessKeys = duplicateValues(accessKeys).length;
  const emptyHeadings = headings.headings.filter((h) => !h.text).length;

  return [
    a11y('lang', 'Idioma do documento', lang && !invalidLang ? 'pass' : lang ? 'warning' : 'warning', lang ? `lang="${lang}" definido${invalidLang ? ', mas o formato parece incomum.' : '.'}` : 'O documento não declara idioma.', lang && !invalidLang ? undefined : 'Defina lang com uma tag BCP 47 apropriada, como pt-BR.', 2),
    a11y('image-alt', 'Texto alternativo em imagens', images.withoutAlt === 0 ? 'pass' : 'warning', images.total ? `${images.withoutAlt} de ${images.total} imagem(ns) sem atributo alt.` : 'Nenhuma imagem encontrada.', images.withoutAlt ? 'Adicione alt útil a imagens informativas; use alt="" em imagens puramente decorativas.' : undefined, 3),
    a11y('form-labels', 'Rótulos de formulários', interactive.unlabeledControls === 0 ? 'pass' : 'fail', `${interactive.unlabeledControls} de ${interactive.controls} controle(s) potencialmente sem rótulo acessível.`, interactive.unlabeledControls ? 'Associe <label for>, aria-label ou aria-labelledby aos campos.' : undefined, 3),
    a11y('button-name', 'Nome acessível de botões', interactive.emptyButtons === 0 ? 'pass' : 'fail', `${interactive.emptyButtons} botão(ões) sem texto ou nome acessível.`, interactive.emptyButtons ? 'Forneça texto visível ou aria-label/aria-labelledby.' : undefined, 2),
    a11y('link-name', 'Nome acessível de links', interactive.emptyLinks === 0 ? 'pass' : 'warning', `${interactive.emptyLinks} link(s) sem texto ou nome acessível.`, interactive.emptyLinks ? 'Garanta que cada link tenha um propósito identificável.' : undefined, 2),
    a11y('heading-order', 'Ordem dos headings', headings.skippedLevels === 0 ? 'pass' : 'warning', `${headings.headings.length} heading(s); ${headings.skippedLevels} salto(s) de nível detectado(s).`, headings.skippedLevels ? 'Evite saltar níveis sem motivo semântico, como H2 direto para H4.' : undefined, 2),
    a11y('empty-headings', 'Headings vazios', emptyHeadings === 0 ? 'pass' : 'warning', `${emptyHeadings} heading(s) vazio(s).`, emptyHeadings ? 'Remova headings vazios ou dê um nome significativo.' : undefined),
    a11y('iframe-title', 'Título de iframes', iframeWithoutTitle === 0 ? 'pass' : 'warning', `${iframeWithoutTitle} de ${iframes.length} iframe(s) sem title/nome acessível.`, iframeWithoutTitle ? 'Dê um title que descreva o conteúdo do iframe.' : undefined, 2),
    a11y('input-image-alt', 'Alt em input[type=image]', inputImageWithoutAlt === 0 ? 'pass' : 'fail', `${inputImageWithoutAlt} input(s) do tipo image sem alt.`, inputImageWithoutAlt ? 'Adicione alt que descreva a ação do botão-imagem.' : undefined, 2),
    a11y('filename-alt', 'Alt que parece nome de arquivo', filenameAlts === 0 ? 'pass' : 'warning', `${filenameAlts} alt(s) parecem nomes de arquivo.` , filenameAlts ? 'Substitua nomes de arquivo por descrições úteis ou alt vazio quando decorativo.' : undefined),
    a11y('svg-name', 'Nome acessível de SVG', svgWithoutName === 0 ? 'pass' : 'info', `${svgWithoutName} de ${svgs.length} SVG(s) sem nome acessível explícito.`, svgWithoutName ? 'SVGs informativos devem ter <title>, aria-label ou aria-labelledby; decorativos podem ser aria-hidden.' : undefined),
    a11y('table-headers', 'Cabeçalhos de tabela', tablesWithoutHeaders === 0 ? 'pass' : 'warning', `${tablesWithoutHeaders} de ${tables.length} tabela(s) sem <th>.`, tablesWithoutHeaders ? 'Use <th> para identificar cabeçalhos em tabelas de dados.' : undefined, 2),
    a11y('table-caption', 'Caption de tabela', tablesWithoutCaption === 0 ? 'pass' : tables.length ? 'info' : 'pass', `${tablesWithoutCaption} de ${tables.length} tabela(s) sem <caption>.`, tablesWithoutCaption ? 'Considere <caption> quando ele ajudar a descrever a tabela.' : undefined),
    a11y('video-captions', 'Legendas em vídeo', mediaWithoutCaptions === 0 ? 'pass' : 'warning', `${mediaWithoutCaptions} de ${videos.length} vídeo(s) sem track de captions detectada.`, mediaWithoutCaptions ? 'Vídeos com fala relevante devem oferecer legendas sincronizadas.' : undefined, 2),
    a11y('audio-controls', 'Controles de áudio', audioWithoutControls === 0 ? 'pass' : 'warning', `${audioWithoutControls} de ${audios.length} áudio(s) sem controls.` , audioWithoutControls ? 'Ofereça controles acessíveis ou uma interface equivalente.' : undefined),
    a11y('positive-tabindex', 'tabindex positivo', positiveTabindex === 0 ? 'pass' : 'warning', `${positiveTabindex} elemento(s) usam tabindex maior que 0.`, positiveTabindex ? 'Evite ordem de foco manual; prefira a ordem natural do DOM e tabindex="0" quando necessário.' : undefined, 2),
    a11y('autofocus', 'Autofocus', autofocus === 0 ? 'pass' : 'info', `${autofocus} elemento(s) com autofocus.`, autofocus ? 'Autofocus pode deslocar foco inesperadamente para leitores de tela; use com critério.' : undefined),
    a11y('empty-aria-label', 'aria-label vazio', emptyAriaLabels === 0 ? 'pass' : 'fail', `${emptyAriaLabels} elemento(s) com aria-label vazio.`, emptyAriaLabels ? 'Remova o atributo ou forneça um nome acessível real.' : undefined, 2),
    a11y('broken-labelledby', 'aria-labelledby válido', brokenLabelledby === 0 ? 'pass' : 'fail', `${brokenLabelledby} elemento(s) referenciam IDs inexistentes em aria-labelledby.`, brokenLabelledby ? 'Corrija as referências para IDs existentes e únicos.' : undefined, 2),
    a11y('broken-describedby', 'aria-describedby válido', brokenDescribedby === 0 ? 'pass' : 'warning', `${brokenDescribedby} elemento(s) referenciam IDs inexistentes em aria-describedby.`, brokenDescribedby ? 'Corrija as referências ARIA para elementos existentes.' : undefined),
    a11y('skip-link', 'Atalho para conteúdo principal', skipLink ? 'pass' : 'info', skipLink ? 'Foi detectado um link de salto para conteúdo.' : 'Nenhum skip link óbvio foi detectado.', skipLink ? undefined : 'Em páginas com navegação repetitiva, um link “Pular para o conteúdo” melhora navegação por teclado.'),
    a11y('main-landmark', 'Landmark principal', mainCount === 1 ? 'pass' : mainCount === 0 ? 'warning' : 'info', `Quantidade aproximada de landmarks main: ${mainCount}.`, mainCount === 0 ? 'Use <main> para identificar o conteúdo principal.' : mainCount > 1 ? 'Normalmente deve existir um único landmark main principal.' : undefined, 2),
    a11y('nav-landmark', 'Landmark de navegação', navCount > 0 ? 'pass' : 'info', `${navCount} elemento(s) <nav> detectado(s).`),
    a11y('zoom', 'Zoom do usuário', zoomBlocked ? 'fail' : 'pass', zoomBlocked ? `Viewport pode bloquear zoom: ${viewport}` : 'Nenhum bloqueio óbvio de zoom foi detectado.', zoomBlocked ? 'Não desabilite user-scalable e evite limitar maximum-scale de forma que impeça ampliação.' : undefined, 3),
    a11y('obsolete-animation', 'Elementos marquee/blink', marqueeBlink === 0 ? 'pass' : 'fail', `${marqueeBlink} elemento(s) <marquee>/<blink> detectado(s).`, marqueeBlink ? 'Remova elementos obsoletos e animações que não oferecem controle adequado.' : undefined, 2),
    a11y('duplicate-accesskey', 'Accesskeys duplicadas', duplicateAccessKeys === 0 ? 'pass' : 'warning', `${duplicateAccessKeys} accesskey(s) duplicada(s).`, duplicateAccessKeys ? 'Accesskeys duplicadas geram conflitos de teclado.' : undefined)
  ];
}

function findViewport(html) {
  for (const tag of findTags(html, 'meta')) {
    const attrs = parseAttributes(tag);
    if ((attrs.name ?? '').toLowerCase() === 'viewport') return attrs.content ?? '';
  }
  return undefined;
}

function duplicateValues(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) { if (seen.has(value)) duplicates.add(value); seen.add(value); }
  return [...duplicates];
}

function a11y(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'Acessibilidade', id, title, severity, message, recommendation, weight };
}
