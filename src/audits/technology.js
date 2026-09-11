export function detectTechnologies(html, headers) {
  const found = new Set();
  const lower = html.toLowerCase();
  const poweredBy = headers.get('x-powered-by');
  const server = headers.get('server');
  if (poweredBy) found.add(poweredBy);
  if (server) found.add(server);

  const patterns = [
    ['Next.js', /__next|\/_next\//i],
    ['React', /react(?:dom)?|data-reactroot/i],
    ['Vue', /__vue__|vue\.js|data-v-[a-f0-9]+/i],
    ['Nuxt', /__nuxt|\/_nuxt\//i],
    ['Angular', /ng-version|ng-app|angular\.js/i],
    ['Svelte/SvelteKit', /__svelte|sveltekit/i],
    ['Astro', /astro-island|data-astro/i],
    ['WordPress', /wp-content|wp-includes/i],
    ['Shopify', /cdn\.shopify\.com|shopify-section/i],
    ['Bootstrap', /bootstrap(?:\.min)?\.(?:css|js)/i],
    ['Tailwind CSS', /tailwind/i],
    ['jQuery', /jquery(?:\.min)?\.js/i]
  ];

  for (const [name, pattern] of patterns) if (pattern.test(lower)) found.add(name);
  if (headers.get('cf-ray') || /cloudflare/i.test(server ?? '')) found.add('Cloudflare');
  if (headers.get('x-vercel-id')) found.add('Vercel');
  if (headers.get('x-nf-request-id')) found.add('Netlify');

  const generator = html.match(/<meta\b[^>]*name=["']generator["'][^>]*content=["']([^"']+)["'][^>]*>/i)
    ?? html.match(/<meta\b[^>]*content=["']([^"']+)["'][^>]*name=["']generator["'][^>]*>/i);
  if (generator?.[1]) found.add(generator[1]);

  return [...found].sort((a, b) => a.localeCompare(b));
}
