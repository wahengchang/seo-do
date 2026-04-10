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

export interface SitemapUrlEntry {
  loc: string;
  lastmod: string;
  changefreq: string;
  priority: string;
  hreflangCount: number;
  hreflangValues: string;
}

export function parseSitemapUrlEntries(xml: string): SitemapUrlEntry[] {
  const entries: SitemapUrlEntry[] = [];
  const urlPattern = /<url>([\s\S]*?)<\/url>/gi;
  let urlMatch: RegExpExecArray | null;

  while ((urlMatch = urlPattern.exec(xml)) !== null) {
    const block = urlMatch[1];

    const locMatch = /<loc>\s*(.*?)\s*<\/loc>/i.exec(block);
    const loc = locMatch ? locMatch[1].trim() : '';
    if (!loc) continue;

    const lastmodMatch = /<lastmod>\s*(.*?)\s*<\/lastmod>/i.exec(block);
    const lastmod = lastmodMatch ? lastmodMatch[1].trim() : '';

    const changefreqMatch = /<changefreq>\s*(.*?)\s*<\/changefreq>/i.exec(block);
    const changefreq = changefreqMatch ? changefreqMatch[1].trim() : '';

    const priorityMatch = /<priority>\s*(.*?)\s*<\/priority>/i.exec(block);
    const priority = priorityMatch ? priorityMatch[1].trim() : '';

    const hreflangPattern = /hreflang="([^"]+)"/gi;
    const hreflangs: string[] = [];
    let hreflangMatch: RegExpExecArray | null;
    while ((hreflangMatch = hreflangPattern.exec(block)) !== null) {
      hreflangs.push(hreflangMatch[1]);
    }

    entries.push({
      loc,
      lastmod,
      changefreq,
      priority,
      hreflangCount: hreflangs.length,
      hreflangValues: hreflangs.join(','),
    });
  }

  return entries;
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
