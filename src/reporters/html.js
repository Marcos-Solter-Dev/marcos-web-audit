function esc(value) {
  return String(value ?? '').replace(/[&<>'"]/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[char]));
}

export function createHtmlReport(report) {
  const grouped = new Map();
  for (const item of report.items) {
    if (!grouped.has(item.category)) grouped.set(item.category, []);
    grouped.get(item.category).push(item);
  }

  const categoryCards = Object.entries(report.categoryScores).map(([category, score]) => `
    <article class="score-card">
      <div class="score-head"><strong>${esc(category)}</strong><span>${score}/100</span></div>
      <div class="bar"><i style="width:${score}%"></i></div>
    </article>`).join('');

  const sections = [...grouped.entries()].map(([category, items]) => `
    <section class="audit-section" data-category="${esc(category)}">
      <div class="section-title"><h2>${esc(category)}</h2><span>${items.length} verificações</span></div>
      <div class="findings">
        ${items.map((item) => `
          <article class="finding ${esc(item.severity)}" data-severity="${esc(item.severity)}">
            <div class="status-dot" aria-hidden="true"></div>
            <div class="finding-body">
              <div class="finding-title"><h3>${esc(item.title)}</h3><span class="pill">${label(item.severity)}</span></div>
              <p>${esc(item.message)}</p>
              ${item.recommendation ? `<div class="recommendation"><strong>Como melhorar</strong><span>${esc(item.recommendation)}</span></div>` : ''}
            </div>
          </article>`).join('')}
      </div>
    </section>`).join('');

  const brokenLinks = report.links.issues.length
    ? `<section class="audit-section"><div class="section-title"><h2>Links com problema</h2><span>${report.links.issues.length}</span></div><div class="table-wrap"><table><thead><tr><th>URL</th><th>Resultado</th></tr></thead><tbody>${report.links.issues.map((item) => `<tr><td><code>${esc(item.url)}</code></td><td>${item.status ? `HTTP ${item.status}` : esc(item.error)}</td></tr>`).join('')}</tbody></table></div></section>`
    : '';

  const crawl = report.crawl.pages.length
    ? `<section class="audit-section"><div class="section-title"><h2>Crawl interno</h2><span>${report.crawl.pages.length} páginas</span></div><div class="table-wrap"><table><thead><tr><th>Score</th><th>Página</th><th>Problemas</th></tr></thead><tbody>${report.crawl.pages.map((page) => `<tr><td>${page.score ?? '—'}</td><td><code>${esc(page.url)}</code>${page.title ? `<small>${esc(page.title)}</small>` : ''}</td><td>${page.issues?.length ?? (page.error ? 'erro' : '—')}</td></tr>`).join('')}</tbody></table></div></section>`
    : '';

  const comparison = report.comparison ? `<section class="comparison"><strong>Comparação com relatório anterior</strong><div>${report.comparison.previousScore} → ${report.comparison.currentScore} <b>${report.comparison.scoreDelta >= 0 ? '+' : ''}${report.comparison.scoreDelta}</b></div></section>` : '';

  return `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light">
<title>Marcos Web Audit — ${esc(report.finalUrl)}</title>
<style>
:root{--blue:#016FF7;--blue2:#58A4EC;--navy:#020916;--navy2:#06152d;--bg:#f5f8fc;--card:#fff;--text:#0b1730;--muted:#68758a;--line:#dce4ef;--danger:#c7363d;--danger-bg:#fff0f1;--warn:#9a6500;--warn-bg:#fff7df;--success:#087a55;--success-bg:#eaf8f2;--info:#145fc8;--info-bg:#eaf2ff}
*{box-sizing:border-box}html{scroll-behavior:smooth}body{margin:0;background:var(--bg);color:var(--text);font:15px/1.55 Inter,ui-sans-serif,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif}a{color:inherit}main{max-width:1180px;margin:auto;padding:28px 20px 72px}.hero{position:relative;overflow:hidden;background:linear-gradient(135deg,var(--navy),#0a2144);color:#fff;border-radius:28px;padding:34px;box-shadow:0 24px 70px rgba(6,21,45,.2)}.hero:after{content:"";position:absolute;width:320px;height:320px;border-radius:50%;right:-100px;top:-120px;background:radial-gradient(circle,var(--blue2),transparent 68%);opacity:.22}.brand{display:flex;align-items:center;justify-content:space-between;gap:16px}.brand strong{font-size:14px;letter-spacing:.1em;text-transform:uppercase}.version{font-size:12px;padding:6px 10px;border:1px solid rgba(255,255,255,.18);border-radius:999px;color:#d9e8ff}.hero-grid{display:grid;grid-template-columns:170px 1fr;gap:28px;align-items:center;margin-top:30px}.ring{--score:${report.score};width:150px;height:150px;border-radius:50%;display:grid;place-items:center;background:conic-gradient(var(--blue) calc(var(--score)*1%),rgba(255,255,255,.12) 0);position:relative}.ring:before{content:"";position:absolute;inset:12px;background:var(--navy2);border-radius:50%}.ring-value{position:relative;text-align:center}.ring-value b{display:block;font-size:42px;line-height:1}.ring-value span{font-size:12px;color:#b9cdf0}.hero h1{font-size:34px;line-height:1.15;margin:0 0 10px;overflow-wrap:anywhere}.hero p{margin:0;color:#c9daf6}.hero-meta{display:flex;gap:10px;flex-wrap:wrap;margin-top:16px}.hero-meta span{font-size:12px;color:#d8e8ff;background:rgba(255,255,255,.06);border:1px solid rgba(255,255,255,.1);border-radius:999px;padding:6px 10px}.summary-grid{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-top:18px}.summary{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:16px}.summary span{display:block;color:var(--muted);font-size:12px}.summary b{font-size:25px}.category-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:12px;margin-top:28px}.score-card{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:16px}.score-head{display:flex;justify-content:space-between;gap:12px;margin-bottom:10px}.score-head span{font-weight:800}.bar{height:8px;background:#edf2f7;border-radius:99px;overflow:hidden}.bar i{display:block;height:100%;background:linear-gradient(90deg,var(--blue),var(--blue2));border-radius:inherit}.toolbar{margin:28px 0 14px;background:var(--card);border:1px solid var(--line);border-radius:18px;padding:12px;box-shadow:0 8px 24px rgba(6,21,45,.045)}.toolbar-row{display:flex;align-items:center;gap:16px;min-width:0}.toolbar-title{display:flex;align-items:center;gap:9px;flex:0 0 auto;font-size:14px}.toolbar-title:before{content:"";width:8px;height:8px;border-radius:50%;background:var(--blue);box-shadow:0 0 0 4px rgba(1,111,247,.1)}.filters{display:flex;align-items:center;gap:7px;min-width:0;overflow-x:auto;scrollbar-width:none;padding:1px;margin-left:auto}.filters::-webkit-scrollbar{display:none}.filter{appearance:none;display:inline-flex;align-items:center;justify-content:center;gap:7px;min-height:38px;white-space:nowrap;border:1px solid #d7e1ee;background:#fff;color:#24324a;border-radius:12px;padding:8px 12px;cursor:pointer;font:600 13px/1 inherit;transition:border-color .18s ease,background .18s ease,color .18s ease,box-shadow .18s ease,transform .18s ease}.filter:hover{border-color:#aacbf6;background:#f5f9ff;color:#075fc8}.filter:focus-visible{outline:3px solid rgba(1,111,247,.18);outline-offset:2px}.filter:active{transform:translateY(1px)}.filter.active{background:var(--blue);border-color:var(--blue);color:#fff;box-shadow:0 5px 14px rgba(1,111,247,.22)}.filter-count{display:inline-grid;place-items:center;min-width:21px;height:21px;padding:0 6px;border-radius:7px;background:#eef3f9;color:#617087;font-size:10px;font-weight:800;line-height:1}.filter.active .filter-count{background:rgba(255,255,255,.18);color:#fff}.audit-section{margin-top:24px}.section-title{display:flex;align-items:end;justify-content:space-between;gap:12px;margin-bottom:10px}.section-title h2{font-size:20px;margin:0}.section-title span{font-size:12px;color:var(--muted)}.findings{display:grid;gap:10px}.finding{display:grid;grid-template-columns:12px 1fr;gap:14px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:17px}.status-dot{width:10px;height:10px;border-radius:50%;margin-top:7px;background:var(--info)}.finding.pass .status-dot{background:var(--success)}.finding.warning .status-dot{background:var(--warn)}.finding.fail .status-dot{background:var(--danger)}.finding-title{display:flex;align-items:center;justify-content:space-between;gap:10px}.finding h3{font-size:15px;margin:0}.finding p{margin:5px 0 0;color:#34425a}.pill{font-size:10px;font-weight:800;letter-spacing:.04em;text-transform:uppercase;padding:5px 8px;border-radius:999px;background:var(--info-bg);color:var(--info)}.pass .pill{background:var(--success-bg);color:var(--success)}.warning .pill{background:var(--warn-bg);color:var(--warn)}.fail .pill{background:var(--danger-bg);color:var(--danger)}.recommendation{display:grid;gap:2px;margin-top:10px;padding:10px 12px;border-radius:10px;background:#f7f9fc;color:#394760}.recommendation strong{font-size:11px;text-transform:uppercase;letter-spacing:.05em;color:var(--muted)}.table-wrap{overflow:auto;background:#fff;border:1px solid var(--line);border-radius:16px}table{border-collapse:collapse;width:100%;min-width:620px}th,td{text-align:left;padding:13px 15px;border-bottom:1px solid var(--line);vertical-align:top}th{font-size:11px;text-transform:uppercase;color:var(--muted);letter-spacing:.05em;background:#fafcff}tr:last-child td{border-bottom:0}td small{display:block;color:var(--muted);margin-top:3px}code{font:12px/1.4 ui-monospace,SFMono-Regular,Menlo,monospace;overflow-wrap:anywhere}.details{display:grid;grid-template-columns:repeat(2,1fr);gap:10px}.detail{background:#fff;border:1px solid var(--line);border-radius:14px;padding:14px}.detail span{display:block;font-size:11px;color:var(--muted);text-transform:uppercase;letter-spacing:.05em}.detail b{display:block;margin-top:4px;overflow-wrap:anywhere}.comparison{margin-top:20px;background:#eef5ff;border:1px solid #cee1ff;border-radius:16px;padding:16px;display:flex;justify-content:space-between;gap:12px}.footer{margin-top:32px;color:var(--muted);font-size:12px;text-align:center}.hidden{display:none!important}@media(max-width:760px){main{padding:14px 12px 44px}.hero{padding:24px;border-radius:22px}.hero-grid{grid-template-columns:1fr}.ring{width:120px;height:120px}.summary-grid{grid-template-columns:repeat(2,1fr)}.category-grid,.details{grid-template-columns:1fr}.hero h1{font-size:27px}.finding-title{align-items:flex-start}.comparison{display:block}.toolbar{padding:10px}.toolbar-row{display:block}.toolbar-title{margin:2px 4px 10px}.filters{margin-left:0;padding-bottom:1px}.filter{min-height:36px;padding:7px 11px}}
</style>
</head>
<body><main>
  <header class="hero">
    <div class="brand"><strong>Marcos Web Audit</strong><span class="version">v${esc(report.tool.version)}</span></div>
    <div class="hero-grid">
      <div class="ring"><div class="ring-value"><b>${report.score}</b><span>${esc(report.grade)} · /100</span></div></div>
      <div><h1>${esc(report.finalUrl)}</h1><p>Auditoria passiva de segurança, SEO, acessibilidade, performance, HTTP, PWA, privacidade e qualidade web.</p><div class="hero-meta"><span>HTTP ${report.status}</span><span>${report.durationMs} ms</span><span>${report.coverage?.checksExecuted ?? report.items.length} checks</span><span>${esc(report.scannedAt)}</span></div></div>
    </div>
  </header>

  <div class="summary-grid">
    <div class="summary"><span>Aprovados</span><b>${report.summary.pass}</b></div>
    <div class="summary"><span>Avisos</span><b>${report.summary.warning}</b></div>
    <div class="summary"><span>Falhas</span><b>${report.summary.fail}</b></div>
    <div class="summary"><span>Links checados</span><b>${report.links.checked}</b></div>
    <div class="summary"><span>Verificações</span><b>${report.coverage?.checksExecuted ?? report.items.length}</b></div>
    <div class="summary"><span>Categorias</span><b>${report.coverage?.categories ?? Object.keys(report.categoryScores).length}</b></div>
  </div>

  <div class="category-grid">${categoryCards}</div>
  ${comparison}

  <div class="toolbar" aria-label="Filtros das verificações">
    <div class="toolbar-row">
      <strong class="toolbar-title">Verificações</strong>
      <div class="filters" role="group" aria-label="Filtrar verificações por resultado">
        <button class="filter active" type="button" data-filter="all" aria-pressed="true">Todas <span class="filter-count">${report.items.length}</span></button>
        <button class="filter" type="button" data-filter="fail" aria-pressed="false">Falhas <span class="filter-count">${report.summary.fail}</span></button>
        <button class="filter" type="button" data-filter="warning" aria-pressed="false">Avisos <span class="filter-count">${report.summary.warning}</span></button>
        <button class="filter" type="button" data-filter="pass" aria-pressed="false">Aprovadas <span class="filter-count">${report.summary.pass}</span></button>
        <button class="filter" type="button" data-filter="info" aria-pressed="false">Info <span class="filter-count">${report.summary.info ?? 0}</span></button>
      </div>
    </div>
  </div>
  ${sections}
  ${brokenLinks}
  ${crawl}

  <section class="audit-section"><div class="section-title"><h2>Detalhes técnicos</h2></div><div class="details">
    <div class="detail"><span>Título</span><b>${esc(report.metadata.title || '—')}</b></div>
    <div class="detail"><span>Description</span><b>${esc(report.metadata.description || '—')}</b></div>
    <div class="detail"><span>Canonical</span><b>${esc(report.metadata.canonical || '—')}</b></div>
    <div class="detail"><span>Tecnologias</span><b>${esc(report.metadata.technologies.join(', ') || 'Nenhuma detectada')}</b></div>
    <div class="detail"><span>HTML</span><b>${Math.round(report.metrics.htmlBytes / 1024)} KB</b></div>
    <div class="detail"><span>TLS</span><b>${esc(report.tls?.protocol || '—')}</b></div>
    <div class="detail"><span>PWA Manifest</span><b>${esc(report.pwa?.manifest?.url || '—')}</b></div>
    <div class="detail"><span>Checks</span><b>${report.coverage?.checksExecuted ?? report.items.length}</b></div>
  </div></section>
  <div class="footer">Marcos Web Audit é uma auditoria passiva e não substitui testes especializados de segurança, acessibilidade ou performance em navegador real.</div>
</main>
<script>
for (const button of document.querySelectorAll('.filter')) button.addEventListener('click', () => {
  document.querySelectorAll('.filter').forEach((x) => {
    x.classList.remove('active');
    x.setAttribute('aria-pressed', 'false');
  });
  button.classList.add('active');
  button.setAttribute('aria-pressed', 'true');
  const filter = button.dataset.filter;
  for (const finding of document.querySelectorAll('.finding')) finding.classList.toggle('hidden', filter !== 'all' && finding.dataset.severity !== filter);
  for (const section of document.querySelectorAll('.audit-section[data-category]')) {
    const visible = [...section.querySelectorAll('.finding')].some((x) => !x.classList.contains('hidden'));
    section.classList.toggle('hidden', !visible);
  }
});
</script>
</body></html>`;
}

function label(severity) {
  return severity === 'pass' ? 'Aprovado' : severity === 'warning' ? 'Aviso' : severity === 'fail' ? 'Falha' : 'Info';
}
