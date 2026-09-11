export function createBadge(report) {
  return {
    schemaVersion: 1,
    label: 'web audit',
    message: `${report.score}/100`,
    color: report.score >= 90 ? 'brightgreen' : report.score >= 80 ? 'green' : report.score >= 70 ? 'yellowgreen' : report.score >= 60 ? 'yellow' : 'red'
  };
}
