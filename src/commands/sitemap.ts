import path from 'node:path';
import { readdir, readFile } from 'node:fs/promises';
import { Command } from 'commander';
import { runSitemapDownload, computeStats, grepSitemapDir, auditSitemapFiles, setIgnoreSsl } from '../sitemap-download.js';
import { parseSitemapXml, isSitemapIndex } from '../shared/sitemap.js';
import { closeBrowser } from '../shared/http.js';
import { writeSitemapAuditCsv } from '../io/files.js';
import type { SitemapFile } from '../sitemap-download.js';

function printStats(label: string, outputDir: string, files: SitemapFile[], stats: ReturnType<typeof computeStats>): void {
  console.log(label);
  console.log(`  Output dir:     ${outputDir}`);
  console.log(`  Files saved:    ${files.length}`);
  console.log(`  Sub-sitemaps:   ${stats.subSitemapCount}`);
  console.log(`  Total URLs:     ${stats.totalUrls.toLocaleString()}`);
  if (stats.urlsPerSitemap.length > 0) {
    console.log('  URLs per sitemap:');
    for (const entry of stats.urlsPerSitemap) {
      console.log(`    ${entry.filename}  ${entry.urlCount}`);
    }
  }
}

export function sitemapCommand(): Command {
  const sitemap = new Command('sitemap').description('Sitemap download and search utilities');

  sitemap
    .command('download')
    .argument('<sitemap-url>', 'root sitemap URL to fetch recursively')
    .option('--output-dir <path>', 'folder to save XML files', './state/sitemaps')
    .option('--max-depth <n>', 'maximum sitemap index recursion depth', '99')
    .option('--ignore-ssl', 'skip SSL certificate verification', false)
    .action(async (url: string, options: { outputDir: string; maxDepth: string; ignoreSsl: boolean }) => {
      const outputDir = path.resolve(options.outputDir);
      if (options.ignoreSsl) setIgnoreSsl(true);
      try {
        const files = await runSitemapDownload(url, outputDir, Number(options.maxDepth));
        const stats = computeStats(files);
        printStats('Sitemap download complete.', outputDir, files, stats);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      } finally {
        await closeBrowser();
      }
    });

  sitemap
    .command('stats')
    .option('--dir <path>', 'folder containing downloaded XML files', './state/sitemaps')
    .action(async (options: { dir: string }) => {
      const dir = path.resolve(options.dir);
      try {
        const entries = await readdir(dir);
        const xmlFiles = entries.filter((f) => f.endsWith('.xml'));
        if (xmlFiles.length === 0) {
          process.stderr.write(`Error: no sitemap files found in ${dir}. Run "seo sitemap download <url>" first.\n`);
          process.exitCode = 1;
          return;
        }

        const files: SitemapFile[] = [];
        for (const xmlFile of xmlFiles) {
          const content = await readFile(path.join(dir, xmlFile), 'utf8');
          const locs = parseSitemapXml(content);
          const isIdx = isSitemapIndex(content);
          files.push({
            url: '',
            filename: xmlFile,
            isIndex: isIdx,
            urlCount: isIdx ? 0 : locs.length,
            filePath: path.join(dir, xmlFile),
          });
        }

        const stats = computeStats(files);
        printStats('Sitemap statistics:', dir, files, stats);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });

  sitemap
    .command('search')
    .argument('<keyword>', 'keyword to search for in sitemap URLs (substring match, case-insensitive)')
    .option('--dir <path>', 'folder containing downloaded XML files', './state/sitemaps')
    .action(async (keyword: string, options: { dir: string }) => {
      const dir = path.resolve(options.dir);
      try {
        const result = await grepSitemapDir(dir, keyword);
        console.log(`Keyword:  "${keyword}"`);
        console.log(`Matches:  ${result.matchCount}`);
        if (result.matchCount > 0) {
          console.log('');
          for (const m of result.matches) {
            console.log(`  [${m.file}] ${m.url}`);
          }
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });

  sitemap
    .command('audit')
    .argument('<sitemap-url>', 'root sitemap URL to fetch and audit sitemap metadata')
    .option('--output <file>', 'CSV output file', './state/sitemap-audit.csv')
    .option('--output-dir <path>', 'folder to save XML files', './state/sitemaps')
    .option('--max-depth <n>', 'maximum sitemap index recursion depth', '99')
    .option('--ignore-ssl', 'skip SSL certificate verification', false)
    .action(async (url: string, options: { output: string; outputDir: string; maxDepth: string; ignoreSsl: boolean }) => {
      const outputDir = path.resolve(options.outputDir);
      const outputFile = path.resolve(options.output);
      if (options.ignoreSsl) setIgnoreSsl(true);
      try {
        // Step 1: Download sitemaps
        console.log('[sitemap-audit] Downloading sitemaps...');
        const files = await runSitemapDownload(url, outputDir, Number(options.maxDepth));
        const stats = computeStats(files);
        console.log(`[sitemap-audit] Found ${stats.totalUrls.toLocaleString()} URLs across ${stats.subSitemapCount} sitemap(s)`);

        if (stats.totalUrls === 0) {
          process.stderr.write('Error: no URLs found in sitemaps. Nothing to audit.\n');
          process.exitCode = 1;
          return;
        }

        // Step 2: Audit sitemap XML metadata (no page fetching)
        console.log('[sitemap-audit] Auditing sitemap metadata...');
        const records = await auditSitemapFiles(outputDir);
        await writeSitemapAuditCsv(outputFile, records);
        console.log(`[sitemap-audit] Audit complete. rows=${records.length} output=${outputFile}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write(`Error: ${message}\n`);
        process.exitCode = 1;
      }
    });

  return sitemap;
}
