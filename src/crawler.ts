import { collectAnchorHrefs } from './shared/html.js';
import { fetchPage } from './shared/http.js';
import { fetchPageCached } from './shared/cache.js';
import { parseSitemapXml, filterSitemapUrls, isSitemapIndex } from './shared/sitemap.js';
import { getSkipReason, normalizeUrl } from './shared/url.js';
import { appendErrors, appendLines, appendSkipped, ensureStateFiles, readLines, writeLines } from './io/files.js';
import { getStatePaths } from './state.js';
import type { CrawlOptions, ErrorRecord, SkippedRecord } from './types.js';

export async function runCrawl(seedUrl: string, options: CrawlOptions): Promise<{ doneCount: number; errorCount: number }> {
  const paths = getStatePaths(options.stateDir);
  await ensureStateFiles(paths);
  const { htmlDir } = paths;

  const seed = new URL(seedUrl);
  let crawlOrigin = seed.origin;
  const normalizedSeed = normalizeUrl(seed.toString(), seed.toString(), crawlOrigin);
  if (!normalizedSeed) {
    throw new Error(`Invalid seed URL: ${seedUrl}`);
  }

  const done = new Set<string>();
  const queued = new Set<string>();
  const queue: string[] = [];
  const skippedRecords: SkippedRecord[] = [];
  const errorRecords: ErrorRecord[] = [];

  // Resume: load existing state if present
  const previousDone = await readLines(paths.doneFile);
  const previousQueue = await readLines(paths.queueFile);

  if (previousDone.length > 0) {
    for (const u of previousDone) { done.add(u); queued.add(u); }
    for (const u of previousQueue) {
      if (!done.has(u) && !queued.has(u)) {
        queued.add(u);
        queue.push(u);
      }
    }
    if (queue.length === 0 && !done.has(normalizedSeed)) {
      queue.push(normalizedSeed);
      queued.add(normalizedSeed);
    }
    // Rewrite files with clean deduped content
    await writeLines(paths.doneFile, [...done]);
    await writeLines(paths.queueFile, [...queue]);
    console.log(`[crawl] resume  origin=${crawlOrigin} already done=${done.size} remaining=${queue.length} maxPages=${options.maxPages}`);
  } else {
    queue.push(normalizedSeed);
    queued.add(normalizedSeed);
    console.log(`[crawl] start  origin=${crawlOrigin} maxPages=${options.maxPages}`);
  }

  while (queue.length > 0 && done.size < options.maxPages) {
    const currentUrl = queue.shift();
    if (!currentUrl) break;

    if (done.has(currentUrl)) {
      continue;
    }

    console.log(`[crawl] fetching [${done.size + 1}] ${currentUrl}`);

    try {
      const page = await fetchPageCached(currentUrl, htmlDir);
      if (done.size === 0 && page.redirected) {
        crawlOrigin = new URL(page.finalUrl).origin;
        console.log(`[crawl] redirect detected, origin updated to ${crawlOrigin}`);
      }

      const processedUrl = normalizeUrl(page.finalUrl, page.finalUrl, crawlOrigin) ?? currentUrl;
      done.add(processedUrl);
      queued.add(processedUrl);
      await appendLines(paths.doneFile, [processedUrl]);

      if (!page.contentType.toLowerCase().includes('text/html')) {
        console.log(`[crawl] skip non-html  ${processedUrl}`);
        skippedRecords.push({ url: processedUrl, reason: 'non_html_resource' });
        continue;
      }

      const hrefs = collectAnchorHrefs(page.body);
      const newUrls: string[] = [];

      for (const href of hrefs) {
        const skipReason = getSkipReason(href, page.finalUrl, crawlOrigin);
        if (skipReason) {
          skippedRecords.push({ url: href, reason: skipReason });
          continue;
        }

        const normalized = normalizeUrl(href, page.finalUrl, crawlOrigin);
        if (!normalized) {
          skippedRecords.push({ url: href, reason: 'invalid' });
          continue;
        }

        if (queued.has(normalized) || done.has(normalized)) {
          skippedRecords.push({ url: normalized, reason: 'duplicate' });
          continue;
        }

        queued.add(normalized);
        queue.push(normalized);
        newUrls.push(normalized);
      }

      console.log(`[crawl] done    [${done.size}/${options.maxPages}] found=${newUrls.length} queue=${queue.length}`);
      await appendLines(paths.queueFile, newUrls);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      console.error(`[crawl] error   ${currentUrl} — ${message}`);
      errorRecords.push({
        url: currentUrl,
        stage: 'crawl',
        message,
      });
    }
  }

  await appendSkipped(paths.skippedFile, skippedRecords);
  await appendErrors(paths.errorFile, errorRecords);

  return { doneCount: done.size, errorCount: errorRecords.length };
}

function isXmlContent(page: { contentType: string; body: string }): boolean {
  const ct = page.contentType.toLowerCase();
  const trimmed = page.body.trimStart();
  return (
    ct.includes('xml') ||
    ct.includes('text/xml') ||
    trimmed.startsWith('<?xml') ||
    trimmed.startsWith('<urlset') ||
    trimmed.startsWith('<sitemapindex')
  );
}

async function fetchSitemapUrls(sitemapUrl: string, maxUrls: number, depth: number = 0): Promise<string[]> {
  const maxDepth = 99;
  if (depth > maxDepth) {
    console.log(`[sitemap] max depth ${maxDepth} reached, skipping ${sitemapUrl}`);
    return [];
  }

  console.log(`[sitemap] fetching ${sitemapUrl}`);
  const page = await fetchPage(sitemapUrl);

  if (page.statusCode !== 200) {
    console.error(`[sitemap] HTTP ${page.statusCode} for ${sitemapUrl}, skipping`);
    return [];
  }

  if (!isXmlContent(page)) {
    console.error(`[sitemap] not XML (${page.contentType}): ${sitemapUrl}, skipping`);
    return [];
  }

  const locs = parseSitemapXml(page.body);

  if (isSitemapIndex(page.body)) {
    console.log(`[sitemap] index with ${locs.length} sub-sitemaps (depth=${depth})`);
    const allUrls: string[] = [];
    for (const subUrl of locs) {
      if (allUrls.length >= maxUrls) {
        console.log(`[sitemap] reached max ${maxUrls} URLs, stopping`);
        break;
      }
      const urls = await fetchSitemapUrls(subUrl, maxUrls - allUrls.length, depth + 1);
      for (const u of urls) allUrls.push(u);
    }
    return allUrls;
  }

  console.log(`[sitemap] found ${locs.length} URLs`);
  return locs.slice(0, maxUrls);
}

export async function runSitemapCrawl(
  sitemapUrl: string,
  options: CrawlOptions,
): Promise<{ doneCount: number; skippedCount: number }> {
  const paths = getStatePaths(options.stateDir);
  await ensureStateFiles(paths);

  const rawUrls = await fetchSitemapUrls(sitemapUrl, options.maxPages);

  if (rawUrls.length === 0) {
    console.log('[sitemap] no URLs found');
    return { doneCount: 0, skippedCount: 0 };
  }

  console.log(`[sitemap] total URLs collected: ${rawUrls.length}`);

  const origin = new URL(sitemapUrl).origin;
  const { urls, skipped } = filterSitemapUrls(rawUrls, origin);

  console.log(`[sitemap] after filtering: ${urls.length} valid, ${skipped.length} skipped`);

  await writeLines(paths.doneFile, urls);
  await appendSkipped(paths.skippedFile, skipped);

  return { doneCount: urls.length, skippedCount: skipped.length };
}
