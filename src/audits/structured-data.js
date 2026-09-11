import { findPairedTags } from '../utils/html.js';

export function auditStructuredData(html, pageUrl) {
  const blocks = findPairedTags(html, 'script').filter(({ attrs }) => (attrs.type ?? '').toLowerCase() === 'application/ld+json');
  const parsed = [];
  let invalid = 0;
  let missingContext = 0;
  let missingType = 0;
  let urlProblems = 0;
  const types = [];
  const ids = [];

  for (const block of blocks) {
    try {
      const value = JSON.parse(block.inner.trim());
      parsed.push(value);
      const roots = Array.isArray(value) ? value : [value];
      for (const root of roots) {
        if (!root || typeof root !== 'object' || Array.isArray(root)) continue;
        if (!root['@context']) missingContext += 1;
        const nodes = Array.isArray(root['@graph']) ? root['@graph'].flatMap(flattenJsonLd) : [root];
        for (const node of nodes) {
          if (!node || typeof node !== 'object' || Array.isArray(node)) continue;
          if (!node['@type']) missingType += 1;
          if (node['@type']) types.push(...toArray(node['@type']).map(String));
          if (node['@id']) ids.push(String(node['@id']));
          for (const key of ['url', '@id']) {
            if (!node[key] || typeof node[key] !== 'string') continue;
            try {
              const resolved = new URL(node[key], pageUrl);
              if (!['http:', 'https:'].includes(resolved.protocol)) urlProblems += 1;
            } catch {
              urlProblems += 1;
            }
          }
        }
      }
    } catch {
      invalid += 1;
    }
  }

  const duplicates = duplicateValues(ids.filter(Boolean));
  const hasBreadcrumb = types.some((type) => type === 'BreadcrumbList');
  const hasOrgOrPerson = types.some((type) => ['Organization', 'Person', 'LocalBusiness', 'Corporation'].includes(type));
  const hasWebSite = types.some((type) => type === 'WebSite');
  const hasGraph = parsed.some((value) => value && typeof value === 'object' && Array.isArray(value['@graph']));
  const microdata = /\bitemscope\b/i.test(html);
  const rdfa = /\b(?:typeof|vocab|about|prefix)\s*=/i.test(html);

  return [
    sd('presence', 'JSON-LD presente', blocks.length ? 'pass' : 'info', blocks.length ? `${blocks.length} bloco(s) JSON-LD encontrado(s).` : 'Nenhum JSON-LD encontrado.', blocks.length ? undefined : 'Adicione dados estruturados apenas para entidades/tipos realmente presentes na página.'),
    sd('valid-json', 'JSON-LD com JSON válido', invalid === 0 ? (blocks.length ? 'pass' : 'info') : 'fail', invalid ? `${invalid} de ${blocks.length} bloco(s) JSON-LD contêm JSON inválido.` : blocks.length ? 'Todos os blocos JSON-LD puderam ser parseados.' : 'Sem JSON-LD para validar.', invalid ? 'Corrija sintaxe JSON antes da publicação.' : undefined, 3),
    sd('context', '@context', blocks.length && missingContext === 0 ? 'pass' : missingContext ? 'warning' : 'info', missingContext ? `${missingContext} nó(s) JSON-LD sem @context.` : blocks.length ? 'Nós principais possuem @context.' : 'Sem JSON-LD para validar.', missingContext ? 'Use @context adequado, normalmente https://schema.org.' : undefined, 2),
    sd('type', '@type', blocks.length && missingType === 0 ? 'pass' : missingType ? 'warning' : 'info', missingType ? `${missingType} nó(s) JSON-LD sem @type.` : types.length ? `Tipos detectados: ${[...new Set(types)].slice(0, 12).join(', ')}.` : 'Nenhum @type detectado.', missingType ? 'Declare @type para as entidades estruturadas.' : undefined, 2),
    sd('urls', 'URLs em dados estruturados', urlProblems === 0 ? 'pass' : 'warning', `${urlProblems} URL(s) problemática(s) em url/@id.`, urlProblems ? 'Use URLs HTTP(S) resolvíveis em url e @id quando aplicável.' : undefined),
    sd('duplicate-id', '@id duplicado', duplicates.length === 0 ? 'pass' : 'warning', duplicates.length ? `${duplicates.length} @id duplicado(s) detectado(s).` : 'Nenhum @id duplicado detectado.', duplicates.length ? 'Confirme se entidades com o mesmo @id representam exatamente o mesmo objeto.' : undefined),
    sd('graph', '@graph', hasGraph ? 'pass' : 'info', hasGraph ? 'Foi detectado @graph para agrupar entidades.' : '@graph não utilizado; isso é opcional.'),
    sd('breadcrumb', 'BreadcrumbList', hasBreadcrumb ? 'pass' : 'info', hasBreadcrumb ? 'BreadcrumbList detectado.' : 'BreadcrumbList não detectado; pode ser desnecessário dependendo da página.'),
    sd('identity-entity', 'Entidade de identidade', hasOrgOrPerson ? 'pass' : 'info', hasOrgOrPerson ? 'Foi detectada entidade de organização/pessoa/negócio.' : 'Nenhuma entidade Organization/Person/LocalBusiness detectada.'),
    sd('website-entity', 'Entidade WebSite', hasWebSite ? 'pass' : 'info', hasWebSite ? 'WebSite detectado.' : 'Entidade WebSite não detectada.'),
    sd('microdata', 'Microdata HTML', microdata ? 'info' : 'pass', microdata ? 'Atributos itemscope/microdata foram detectados.' : 'Nenhum microdata HTML detectado.'),
    sd('rdfa', 'RDFa', rdfa ? 'info' : 'pass', rdfa ? 'Sinais de RDFa foram detectados.' : 'Nenhum RDFa detectado.'),
    sd('mixed-formats', 'Múltiplos formatos estruturados', (blocks.length && (microdata || rdfa)) ? 'info' : 'pass', (blocks.length && (microdata || rdfa)) ? 'JSON-LD aparece junto com Microdata/RDFa.' : 'Nenhuma mistura de formatos estruturados detectada.', (blocks.length && (microdata || rdfa)) ? 'Misturar formatos pode ser válido, mas mantenha os dados consistentes.' : undefined)
  ];
}

function flattenJsonLd(value) {
  if (Array.isArray(value)) return value.flatMap(flattenJsonLd);
  if (!value || typeof value !== 'object') return [];
  const nodes = [value];
  if (Array.isArray(value['@graph'])) nodes.push(...value['@graph'].flatMap(flattenJsonLd));
  return nodes;
}

function toArray(value) { return Array.isArray(value) ? value : [value]; }

function duplicateValues(values) {
  const seen = new Set();
  const dup = new Set();
  for (const value of values) {
    if (seen.has(value)) dup.add(value);
    seen.add(value);
  }
  return [...dup];
}

function sd(id, title, severity, message, recommendation, weight = 1) {
  return { category: 'Dados estruturados', id: `structured-${id}`, title, severity, message, recommendation, weight };
}
