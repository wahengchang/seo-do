import { describe, expect, it, vi, beforeEach, afterEach } from 'vitest';
import { mkdtemp, rm, readdir, writeFile, readFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const { mockRequest } = vi.hoisted(() => {
  const mockRequest = vi.fn();
  return { mockRequest };
});
vi.mock('undici', async (importOriginal) => {
  const actual = await importOriginal<typeof import('undici')>();
  return { ...actual, request: mockRequest };
});

import { runSitemapDownload, computeStats, searchSitemapDir } from '../src/sitemap-download.js';
import type { SitemapFile } from '../src/sitemap-download.js';

function mockXmlResponse(statusCode: number, body: string) {
  return { statusCode, body: { text: () => Promise.resolve(body) } };
}

let tempDir: string;

beforeEach(async () => {
  tempDir = await mkdtemp(join(tmpdir(), 'seo-sitemap-dl-'));
  vi.clearAllMocks();
});

afterEach(async () => {
  await rm(tempDir, { recursive: true, force: true });
});

describe('runSitemapDownload', () => {
  it('SD-01: saves a single sitemap XML to outputDir', async () => {
    const xmlBody = '<?xml version="1.0"?><urlset><url><loc>https://example.com/page1</loc></url><url><loc>https://example.com/page2</loc></url></urlset>';
    mockRequest.mockResolvedValueOnce(mockXmlResponse(200, xmlBody));

    const files = await runSitemapDownload('https://example.com/sitemap.xml', tempDir);

    expect(files).toHaveLength(1);
    expect(files[0].isIndex).toBe(false);
    expect(files[0].urlCount).toBe(2);

    // File should exist on disk
    const dirContents = await readdir(tempDir);
    expect(dirContents).toHaveLength(1);
    const savedContent = await readFile(join(tempDir, dirContents[0]), 'utf8');
    expect(savedContent).toBe(xmlBody);
  });

  it('SD-02: recurses into sitemapindex and saves sub-sitemaps', async () => {
    const indexBody = '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap><sitemap><loc>https://example.com/sitemap-blog.xml</loc></sitemap></sitemapindex>';
    const pagesBody = '<?xml version="1.0"?><urlset><url><loc>https://example.com/page1</loc></url></urlset>';
    const blogBody = '<?xml version="1.0"?><urlset><url><loc>https://example.com/blog/post1</loc></url><url><loc>https://example.com/blog/post2</loc></url></urlset>';

    mockRequest
      .mockResolvedValueOnce(mockXmlResponse(200, indexBody))
      .mockResolvedValueOnce(mockXmlResponse(200, pagesBody))
      .mockResolvedValueOnce(mockXmlResponse(200, blogBody));

    const files = await runSitemapDownload('https://example.com/sitemap.xml', tempDir);

    expect(files).toHaveLength(3);
    expect(files[0].isIndex).toBe(true);
    expect(files[0].urlCount).toBe(0);
    expect(files[1].isIndex).toBe(false);
    expect(files[1].urlCount).toBe(1);
    expect(files[2].isIndex).toBe(false);
    expect(files[2].urlCount).toBe(2);

    const dirContents = await readdir(tempDir);
    expect(dirContents).toHaveLength(3);
  });

  it('SD-03: skips already-visited URLs to prevent infinite recursion', async () => {
    const selfRefIndex = '<?xml version="1.0"?><sitemapindex><sitemap><loc>https://example.com/sitemap.xml</loc></sitemap><sitemap><loc>https://example.com/sitemap-pages.xml</loc></sitemap></sitemapindex>';
    const pagesBody = '<?xml version="1.0"?><urlset><url><loc>https://example.com/page1</loc></url></urlset>';

    mockRequest
      .mockResolvedValueOnce(mockXmlResponse(200, selfRefIndex))
      .mockResolvedValueOnce(mockXmlResponse(200, pagesBody));

    const files = await runSitemapDownload('https://example.com/sitemap.xml', tempDir);

    // Should NOT infinite loop — self-reference is skipped
    expect(files).toHaveLength(2);
    expect(mockRequest).toHaveBeenCalledTimes(2); // root + pages, NOT root again
  });
});

describe('computeStats', () => {
  it('SD-04: returns correct stats from SitemapFile array', () => {
    const files: SitemapFile[] = [
      { url: 'https://example.com/sitemap.xml', filename: '00-sitemap.xml', isIndex: true, urlCount: 0, filePath: '/tmp/00-sitemap.xml' },
      { url: 'https://example.com/sitemap-pages.xml', filename: '01-sitemap-pages.xml', isIndex: false, urlCount: 5, filePath: '/tmp/01-sitemap-pages.xml' },
      { url: 'https://example.com/sitemap-blog.xml', filename: '02-sitemap-blog.xml', isIndex: false, urlCount: 3, filePath: '/tmp/02-sitemap-blog.xml' },
    ];

    const stats = computeStats(files);

    expect(stats.totalUrls).toBe(8);
    expect(stats.subSitemapCount).toBe(2);
    expect(stats.urlsPerSitemap).toEqual([
      { filename: '01-sitemap-pages.xml', urlCount: 5 },
      { filename: '02-sitemap-blog.xml', urlCount: 3 },
    ]);
  });
});

describe('searchSitemapDir', () => {
  it('SD-05: finds a URL in saved XML files with normalized match', async () => {
    // Write an XML file with a URL without trailing slash
    const xml = '<?xml version="1.0"?><urlset><url><loc>https://example.com/page</loc></url><url><loc>https://example.com/other</loc></url></urlset>';
    await writeFile(join(tempDir, '01-pages.xml'), xml, 'utf8');

    // Search with trailing slash — should still match due to normalization
    const result = await searchSitemapDir(tempDir, 'https://example.com/page/');
    expect(result.found).toBe(true);
    expect(result.foundIn).toContain('01-pages.xml');
  });

  it('SD-06: returns found=false when target URL is absent', async () => {
    const xml = '<?xml version="1.0"?><urlset><url><loc>https://example.com/page1</loc></url></urlset>';
    await writeFile(join(tempDir, '01-pages.xml'), xml, 'utf8');

    const result = await searchSitemapDir(tempDir, 'https://example.com/nonexistent');
    expect(result.found).toBe(false);
    expect(result.foundIn).toEqual([]);
  });
});
