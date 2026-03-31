import path from 'node:path';
import { runCrawl } from '../crawler.js';
import { closeBrowser } from '../shared/http.js';

export async function crawlCommand(
  url: string,
  options: { stateDir: string; maxPages: string | number },
): Promise<void> {
  const stateDir = path.resolve(options.stateDir);
  const maxPages = Number(options.maxPages);
  try {
    const result = await runCrawl(url, { stateDir, maxPages });
    console.log(`Crawl completed. done=${result.doneCount} errors=${result.errorCount} state=${stateDir}`);
  } finally {
    await closeBrowser();
  }
}
