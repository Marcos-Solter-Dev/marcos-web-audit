export function createSarifReport(report) {
  const rules = new Map();
  for (const item of report.items) {
    const ruleId = `${slug(item.category)}.${item.id}`;
    if (!rules.has(ruleId)) {
      rules.set(ruleId, {
        id: ruleId,
        name: item.title,
        shortDescription: { text: item.title },
        fullDescription: { text: item.recommendation || item.message },
        properties: { category: item.category, defaultSeverity: item.severity }
      });
    }
  }

  const results = report.items
    .filter((item) => item.severity === 'fail' || item.severity === 'warning')
    .map((item) => ({
      ruleId: `${slug(item.category)}.${item.id}`,
      level: item.severity === 'fail' ? 'error' : 'warning',
      message: { text: item.recommendation ? `${item.message} Recomendação: ${item.recommendation}` : item.message },
      locations: [{ physicalLocation: { artifactLocation: { uri: report.finalUrl } } }],
      properties: { category: item.category, severity: item.severity, score: report.score }
    }));

  return {
    version: '2.1.0',
    $schema: 'https://json.schemastore.org/sarif-2.1.0.json',
    runs: [{
      tool: {
        driver: {
          name: report.tool.name,
          version: report.tool.version,
          informationUri: 'https://github.com/Marcos-Solter-Dev/marcos-web-audit',
          rules: [...rules.values()]
        }
      },
      invocations: [{ executionSuccessful: true }],
      results,
      properties: { target: report.finalUrl, score: report.score, grade: report.grade, checksExecuted: report.coverage?.checksExecuted }
    }]
  };
}

function slug(value) {
  return String(value).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '');
}
