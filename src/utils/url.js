export function normalizeUrl(input) {
  const trimmed = String(input ?? '').trim();
  if (!trimmed) throw new Error('Informe uma URL ou domínio.');
  const value = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
  const url = new URL(value);
  if (!['http:', 'https:'].includes(url.protocol)) throw new Error('A URL precisa usar HTTP ou HTTPS.');
  return url;
}

export function sameOrigin(a, b) {
  return new URL(a).origin === new URL(b).origin;
}

export function sanitizeUrl(value) {
  const url = new URL(value);
  if (url.username) url.username = '***';
  if (url.password) url.password = '***';
  for (const key of [...url.searchParams.keys()]) {
    if (/token|key|secret|auth|password|session|code/i.test(key)) url.searchParams.set(key, '[redacted]');
  }
  return url.toString();
}
