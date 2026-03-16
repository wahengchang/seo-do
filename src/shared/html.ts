import * as cheerio from 'cheerio';

export function loadHtml(html: string) {
  return cheerio.load(html);
}

export function collectAnchorHrefs(html: string): string[] {
  const $ = loadHtml(html);
  return $('a[href]')
    .map((_, element) => $(element).attr('href')?.trim() ?? '')
    .get()
    .filter(Boolean);
}

export function collectHeadings(html: string, tag: 'h1' | 'h2' | 'h3'): string[] {
  const $ = loadHtml(html);
  return $(tag)
    .map((_, element) => normalizeWhitespace($(element).text()))
    .get()
    .filter(Boolean);
}

export function normalizeWhitespace(value: string): string {
  return value.replace(/\s+/g, ' ').trim();
}
