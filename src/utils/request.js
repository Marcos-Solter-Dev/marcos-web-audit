export async function fetchWithTimeout(url, options = {}) {
  const timeoutMs = numberOption(options.timeoutMs, 10_000, 500, 120_000);
  const retries = numberOption(options.retries, 0, 0, 3);
  let lastError;

  for (let attempt = 0; attempt <= retries; attempt += 1) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);
    const started = performance.now();
    try {
      const response = await fetch(url, {
        redirect: options.redirect ?? 'follow',
        method: options.method ?? 'GET',
        signal: controller.signal,
        headers: {
          'user-agent': options.userAgent ?? 'MarcosWebAudit/3.0 (+https://github.com/Marcos-Solter-Dev/marcos-web-audit)',
          'accept': options.accept ?? '*/*',
          ...(options.headers ?? {})
        }
      });
      return { response, elapsedMs: Math.round(performance.now() - started), attempts: attempt + 1 };
    } catch (error) {
      lastError = error;
      if (attempt < retries) await sleep(150 * (attempt + 1));
    } finally {
      clearTimeout(timer);
    }
  }

  throw lastError;
}

export async function fetchText(url, options = {}) {
  const { response, elapsedMs, attempts } = await fetchWithTimeout(url, options);
  const text = await response.text();
  return {
    response,
    text,
    elapsedMs,
    attempts,
    bytes: Buffer.byteLength(text, 'utf8')
  };
}

export async function mapLimit(values, limit, mapper) {
  const results = new Array(values.length);
  let next = 0;
  const workers = Array.from({ length: Math.max(1, Math.min(limit, values.length || 1)) }, async () => {
    while (true) {
      const index = next;
      next += 1;
      if (index >= values.length) return;
      results[index] = await mapper(values[index], index);
    }
  });
  await Promise.all(workers);
  return results;
}

function numberOption(value, fallback, min, max) {
  const parsed = Number(value ?? fallback);
  if (!Number.isFinite(parsed)) return fallback;
  return Math.max(min, Math.min(max, Math.round(parsed)));
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
