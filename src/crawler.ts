import { collectAnchorHrefs } from './shared/html.js';
import { fetchPage } from './shared/http.js';
import { getSkipReason, normalizeUrl } from './shared/url.js';
import { appendErrors, appendLines, appendSkipped, ensureStateFiles } from './io/files.js';
import { getStatePaths } from './state.js';
import type { CrawlOptions, ErrorRecord, SkippedRecord } from './types.js';

export async function runCrawl(seedUrl: string, options: CrawlOptions): Promise<{ doneCount: number; errorCount: number }> {
  const paths = getStatePaths(options.stateDir);
  await ensureStateFiles(paths);

  const seed = new URL(seedUrl);
  let crawlOrigin = seed.origin;
  const normalizedSeed = normalizeUrl(seed.toString(), seed.toString(), crawlOrigin);
  if (!normalizedSeed) {
    throw new Error(`Invalid seed URL: ${seedUrl}`);
  }

  const queue: string[] = [normalizedSeed];
  const queued = new Set(queue);
  const done = new Set<string>();
  const skippedRecords: SkippedRecord[] = [];
  const errorRecords: ErrorRecord[] = [];

  while (queue.length > 0 && done.size < options.maxPages) {
    const currentUrl = queue.shift();
    if (!currentUrl) break;

    if (done.has(currentUrl)) {
      continue;
    }

    try {
      const page = await fetchPage(currentUrl);
      if (done.size === 0 && page.redirected) {
        crawlOrigin = new URL(page.finalUrl).origin;
      }

      const processedUrl = normalizeUrl(page.finalUrl, page.finalUrl, crawlOrigin) ?? currentUrl;
      done.add(processedUrl);
      await appendLines(paths.doneFile, [processedUrl]);

      if (!page.contentType.toLowerCase().includes('text/html')) {
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

      await appendLines(paths.queueFile, newUrls);
    } catch (error) {
      errorRecords.push({
        url: currentUrl,
        stage: 'crawl',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await appendSkipped(paths.skippedFile, skippedRecords);
  await appendErrors(paths.errorFile, errorRecords);

  return { doneCount: done.size, errorCount: errorRecords.length };
}
