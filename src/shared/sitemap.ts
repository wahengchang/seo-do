import type { SkippedRecord } from '../types.js';
import { getSkipReason, normalizeUrl } from './url.js';

export function isSitemapIndex(xml: string): boolean {
  return /<sitemapindex[\s>]/i.test(xml);
}

export function parseSitemapXml(xml: string): string[] {
  const results: string[] = [];
  const pattern = /<loc>\s*(.*?)\s*<\/loc>/gi;
  let match: RegExpExecArray | null;
  while ((match = pattern.exec(xml)) !== null) {
    const url = match[1].trim();
    if (url) {
      results.push(url);
    }
  }
  return results;
}

export function filterSitemapUrls(
  rawUrls: string[],
  origin: string,
): { urls: string[]; skipped: SkippedRecord[] } {
  const baseUrl = `${origin}/`;
  const seen = new Set<string>();
  const urls: string[] = [];
  const skipped: SkippedRecord[] = [];

  for (const rawUrl of rawUrls) {
    const skipReason = getSkipReason(rawUrl, baseUrl, origin);
    if (skipReason) {
      skipped.push({ url: rawUrl, reason: skipReason });
      continue;
    }

    const normalized = normalizeUrl(rawUrl, baseUrl, origin);
    if (!normalized) {
      skipped.push({ url: rawUrl, reason: 'invalid' });
      continue;
    }

    if (seen.has(normalized)) {
      // Deduplicate silently — no skipped record needed for duplicates
      continue;
    }

    seen.add(normalized);
    urls.push(normalized);
  }

  return { urls, skipped };
}
