import { describe, expect, it } from 'vitest';
import { filterSitemapUrls, isSitemapIndex, parseSitemapXml } from '../src/shared/sitemap.js';

describe('parseSitemapXml', () => {
  it('extracts loc URLs from a valid sitemap', () => {
    const xml = `<urlset><url><loc>https://example.com/page1</loc></url><url><loc>https://example.com/page2</loc></url></urlset>`;
    expect(parseSitemapXml(xml)).toEqual([
      'https://example.com/page1',
      'https://example.com/page2',
    ]);
  });

  it('extracts loc URLs when XML namespace is present', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <url>
    <loc>https://example.com/about</loc>
    <lastmod>2024-01-01</lastmod>
    <changefreq>monthly</changefreq>
    <priority>0.8</priority>
  </url>
  <url>
    <loc>https://example.com/contact</loc>
  </url>
</urlset>`;
    expect(parseSitemapXml(xml)).toEqual([
      'https://example.com/about',
      'https://example.com/contact',
    ]);
  });

  it('returns empty array for empty string', () => {
    expect(parseSitemapXml('')).toEqual([]);
  });

  it('returns empty array for non-sitemap XML (no loc elements)', () => {
    expect(parseSitemapXml('<html><body>Not XML</body></html>')).toEqual([]);
  });

  it('ignores lastmod, priority, changefreq — only returns loc text', () => {
    const xml = `<urlset>
      <url>
        <loc>https://example.com/page</loc>
        <lastmod>2024-06-15</lastmod>
        <priority>0.5</priority>
        <changefreq>weekly</changefreq>
      </url>
    </urlset>`;
    const result = parseSitemapXml(xml);
    expect(result).toHaveLength(1);
    expect(result[0]).toBe('https://example.com/page');
  });

  it('trims whitespace from loc values', () => {
    const xml = `<urlset><url><loc>
  https://example.com/trimmed
</loc></url></urlset>`;
    expect(parseSitemapXml(xml)).toEqual(['https://example.com/trimmed']);
  });
});

describe('isSitemapIndex', () => {
  it('returns true for sitemapindex XML', () => {
    const xml = `<?xml version="1.0" encoding="UTF-8"?>
<sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
  <sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap>
</sitemapindex>`;
    expect(isSitemapIndex(xml)).toBe(true);
  });

  it('returns false for urlset XML', () => {
    const xml = `<urlset><url><loc>https://example.com/page</loc></url></urlset>`;
    expect(isSitemapIndex(xml)).toBe(false);
  });

  it('returns false for empty string', () => {
    expect(isSitemapIndex('')).toBe(false);
  });
});

describe('filterSitemapUrls', () => {
  const origin = 'https://example.com';

  it('normalizes valid same-origin URLs', () => {
    const rawUrls = ['https://example.com/page1', 'https://example.com/page2/'];
    const { urls, skipped } = filterSitemapUrls(rawUrls, origin);
    expect(urls).toContain('https://example.com/page1');
    expect(urls).toContain('https://example.com/page2');
    expect(skipped).toHaveLength(0);
  });

  it('skips non-HTML extensions (.pdf, .jpg)', () => {
    const rawUrls = [
      'https://example.com/brochure.pdf',
      'https://example.com/photo.jpg',
      'https://example.com/page',
    ];
    const { urls, skipped } = filterSitemapUrls(rawUrls, origin);
    expect(urls).toEqual(['https://example.com/page']);
    expect(skipped).toHaveLength(2);
    const reasons = skipped.map((s) => s.reason);
    expect(reasons).toContain('non_html_resource');
  });

  it('skips external URLs', () => {
    const rawUrls = ['https://example.com/page', 'https://other.com/page'];
    const { urls, skipped } = filterSitemapUrls(rawUrls, origin);
    expect(urls).toEqual(['https://example.com/page']);
    expect(skipped).toHaveLength(1);
    expect(skipped[0].reason).toBe('external');
  });

  it('deduplicates normalized URLs', () => {
    const rawUrls = [
      'https://example.com/page/',
      'https://example.com/page',
      'https://example.com/page?utm_source=x',
    ];
    const { urls } = filterSitemapUrls(rawUrls, origin);
    // All three normalize to the same URL — only one should appear
    expect(urls).toHaveLength(1);
    expect(urls[0]).toBe('https://example.com/page');
  });

  it('returns skipped records with correct reasons', () => {
    const rawUrls = [
      'https://example.com/doc.pdf',
      'https://other.com/page',
      'https://example.com/valid',
    ];
    const { urls, skipped } = filterSitemapUrls(rawUrls, origin);
    expect(urls).toEqual(['https://example.com/valid']);
    expect(skipped).toHaveLength(2);
    const pdfSkip = skipped.find((s) => s.url === 'https://example.com/doc.pdf');
    expect(pdfSkip?.reason).toBe('non_html_resource');
    const extSkip = skipped.find((s) => s.url === 'https://other.com/page');
    expect(extSkip?.reason).toBe('external');
  });
});
