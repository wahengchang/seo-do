import type { RobotsDirective } from '../types.js';

const CANONICAL_DIRECTIVES: Record<string, string> = {
  disallow: 'Disallow',
  allow: 'Allow',
  sitemap: 'Sitemap',
  'crawl-delay': 'Crawl-delay',
};

export function parseRobotsTxt(content: string): RobotsDirective[] {
  const directives: RobotsDirective[] = [];
  let currentUserAgent = '';

  for (const rawLine of content.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith('#')) continue;

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue;

    const key = line.slice(0, colonIndex).trim().toLowerCase();
    const value = line.slice(colonIndex + 1).trim();

    if (key === 'user-agent') {
      currentUserAgent = value;
      continue;
    }

    const canonical = CANONICAL_DIRECTIVES[key];
    if (!canonical) continue;

    directives.push({
      userAgent: canonical === 'Sitemap' ? '' : currentUserAgent,
      directive: canonical,
      value,
    });
  }

  return directives;
}
