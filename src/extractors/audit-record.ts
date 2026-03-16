import { loadHtml, normalizeWhitespace } from '../shared/html.js';
import type { AuditRecord, FetchPageResult } from '../types.js';

export function buildAuditRecord(page: FetchPageResult, origin: string): AuditRecord {
  const $ = loadHtml(page.body);
  const title = normalizeWhitespace($('title').first().text());
  const description =
    $('meta[name="description"]').attr('content')?.trim() ??
    $('meta[name="Description"]').attr('content')?.trim() ??
    '';
  const canonical = $('link[rel="canonical"]').attr('href')?.trim() ?? '';

  const h1Text = collectHeadingText($, 'h1');
  const h2Text = collectHeadingText($, 'h2');
  const h3Text = collectHeadingText($, 'h3');
  const ldJson = $('script[type="application/ld+json"]')
    .map((_, element) => normalizeWhitespace($(element).html() ?? ''))
    .get()
    .filter(Boolean);

  const structuredTypes = extractStructuredTypes(ldJson);
  const ga4Ids = extractMatches(page.body, /\bG-[A-Z0-9]{6,}\b/g);
  const gtmIds = extractMatches(page.body, /\bGTM-[A-Z0-9]{4,}\b/g);
  const bodyText = normalizeWhitespace($('body').text());

  return {
    url: page.url,
    title,
    description,
    canonical,
    isRedirect: page.redirected ? 'TRUE' : 'FALSE',
    h1Count: h1Text.length,
    h1Text: h1Text.join(','),
    h2Count: h2Text.length,
    h2Text: h2Text.join(','),
    h3Count: h3Text.length,
    h3Text: h3Text.join(','),
    size: page.body.length,
    ga4Count: ga4Ids.length,
    ga4Ids: ga4Ids.join(','),
    gtmCount: gtmIds.length,
    gtmIds: gtmIds.join(','),
    isBreadcrumb: structuredTypes.has('BreadcrumbList') ? 'TRUE' : 'FALSE',
    isBlogPosting: structuredTypes.has('BlogPosting') ? 'TRUE' : 'FALSE',
    isArticle: structuredTypes.has('Article') ? 'TRUE' : 'FALSE',
    isFaq: structuredTypes.has('FAQPage') ? 'TRUE' : 'FALSE',
    isLogo: page.body.includes('"logo"') ? 'TRUE' : 'FALSE',
    isSsr: title || bodyText || structuredTypes.size > 0 ? 'TRUE' : 'FALSE',
    countStructureData: ldJson.length,
  };
}

function collectHeadingText($: ReturnType<typeof loadHtml>, tag: 'h1' | 'h2' | 'h3'): string[] {
  return $(tag)
    .map((_, element) => normalizeWhitespace($(element).text()))
    .get()
    .filter(Boolean);
}

function extractStructuredTypes(chunks: string[]): Set<string> {
  const types = new Set<string>();

  for (const chunk of chunks) {
    for (const type of extractMatches(chunk, /"@type"\s*:\s*"([^"]+)"/g, 1)) {
      types.add(type);
    }
  }

  return types;
}

function extractMatches(input: string, pattern: RegExp, group = 0): string[] {
  const matches = new Set<string>();
  for (const match of input.matchAll(pattern)) {
    const value = match[group];
    if (value) matches.add(value);
  }
  return [...matches];
}
