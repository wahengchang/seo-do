import path from 'node:path';
import { access, readdir, readFile, writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import { createProject, listProjects, deleteProject, loadProject, listRuns } from '../project.js';
import type { RunInfo } from '../project.js';
import { todayDateStr, resolveDate } from '../date-resolver.js';
import { crawlCommand } from './crawl.js';
import { auditCommand } from './audit.js';
import { getStatePaths } from '../state.js';
import { ensureDir } from '../io/files.js';
import { runSitemapDownload, computeStats, grepSitemapDir, setIgnoreSsl } from '../sitemap-download.js';
import type { SitemapFile } from '../sitemap-download.js';
import { parseSitemapXml, isSitemapIndex } from '../shared/sitemap.js';
import { runAudit } from '../audit.js';
import { closeBrowser } from '../shared/http.js';
import { generateProjectDiffs } from '../diff.js';
import { parse } from 'csv-parse/sync';

export function projectCommand(): Command {
  const project = new Command('project').description('Manage named SEO projects');

  project
    .command('create')
    .argument('<name>', 'project name (alphanumeric, hyphens, underscores)')
    .requiredOption('--url <url>', 'root URL for the project')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .action(async (name: string, options: { url: string; projectsDir: string }) => {
      try {
        await createProject(name, options.url, path.resolve(options.projectsDir));
        console.log(`Created project "${name}" -> ${options.url}`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write('Error: ' + message + '\n');
        process.exitCode = 1;
      }
    });

  project
    .command('list')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .action(async (options: { projectsDir: string }) => {
      try {
        const projects = await listProjects(path.resolve(options.projectsDir));
        if (projects.length === 0) {
          console.log('No projects found.');
          return;
        }
        const nameWidth = Math.max(4, ...projects.map((p) => p.name.length));
        const urlWidth = Math.max(3, ...projects.map((p) => p.url.length));
        console.log(
          'Name'.padEnd(nameWidth) + '  ' + 'URL'.padEnd(urlWidth) + '  ' + 'Created',
        );
        for (const p of projects) {
          console.log(
            p.name.padEnd(nameWidth) + '  ' + p.url.padEnd(urlWidth) + '  ' + p.createdAt,
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write('Error: ' + message + '\n');
        process.exitCode = 1;
      }
    });

  project
    .command('delete')
    .argument('<name>', 'project name to delete')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .action(async (name: string, options: { projectsDir: string }) => {
      try {
        await deleteProject(name, path.resolve(options.projectsDir));
        console.log(`Deleted project "${name}"`);
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write('Error: ' + message + '\n');
        process.exitCode = 1;
      }
    });

  project
    .command('runs')
    .argument('<name>', 'project name')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .action(async (name: string, options: { projectsDir: string }) => {
      try {
        const projectsDir = path.resolve(options.projectsDir);
        const runs: RunInfo[] = await listRuns(name, projectsDir);
        if (runs.length === 0) {
          console.log(`No runs found for project "${name}".`);
          return;
        }
        const dateWidth = 10; // YYYY-MM-DD is always 10 chars
        const typeWidth = Math.max(4, ...runs.map((r) => r.type.length));
        console.log(
          'Date'.padEnd(dateWidth) + '  ' +
          'Type'.padEnd(typeWidth) + '  ' +
          'Files',
        );
        for (const run of runs) {
          console.log(
            run.date.padEnd(dateWidth) + '  ' +
            run.type.padEnd(typeWidth) + '  ' +
            String(run.fileCount),
          );
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write('Error: ' + message + '\n');
        process.exitCode = 1;
      }
    });

  // pages subgroup
  const pages = new Command('pages').description('Crawl and audit project pages by date');

  pages
    .command('crawl')
    .argument('<name>', 'project name')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .option('--max-pages <number>', 'maximum pages to crawl', '100')
    .action(
      async (name: string, options: { projectsDir: string; maxPages: string | number }) => {
        try {
          const projectsDir = path.resolve(options.projectsDir);
          const project = await loadProject(name, projectsDir);
          const dateStr = todayDateStr();
          const stateDir = path.join(projectsDir, name, dateStr);
          await ensureDir(stateDir);
          await crawlCommand(project.url, { stateDir, maxPages: options.maxPages });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          process.stderr.write('Error: ' + message + '\n');
          process.exitCode = 1;
        }
      },
    );

  pages
    .command('audit')
    .argument('<name>', 'project name')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .option('--date <date>', 'date to audit (YYYY-MM-DD, "yesterday", "last-week")')
    .option('--origin <url>', 'origin override for same-site calculations')
    .action(
      async (
        name: string,
        options: { projectsDir: string; date?: string; origin?: string },
      ) => {
        try {
          const projectsDir = path.resolve(options.projectsDir);
          await loadProject(name, projectsDir);
          const dateDir = await resolveDate(name, options.date, projectsDir);
          const paths = getStatePaths(dateDir);

          try {
            await access(paths.doneFile);
          } catch {
            throw new Error(
              `No done.txt found in ${dateDir}. Run "seo project pages crawl ${name}" first.`,
            );
          }

          await auditCommand(paths.doneFile, { output: paths.auditFile, origin: options.origin });
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          process.stderr.write('Error: ' + message + '\n');
          process.exitCode = 1;
        }
      },
    );

  project.addCommand(pages);

  // sitemap subgroup
  const sitemap = new Command('sitemap').description('Download, inspect, search, and audit project sitemaps by date');

  sitemap
    .command('download')
    .argument('<name>', 'project name')
    .argument('[sitemap-url]', 'sitemap URL (defaults to <project-url>/sitemap.xml)')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .option('--max-depth <n>', 'maximum sitemap index recursion depth', '3')
    .option('--ignore-ssl', 'skip SSL certificate verification', false)
    .action(
      async (name: string, sitemapUrlArg: string | undefined, options: { projectsDir: string; maxDepth: string; ignoreSsl: boolean }) => {
        if (options.ignoreSsl) setIgnoreSsl(true);
        try {
          const projectsDir = path.resolve(options.projectsDir);
          const project = await loadProject(name, projectsDir);
          const dateStr = todayDateStr();
          const outputDir = path.join(projectsDir, name, dateStr, 'sitemaps') + '/';
          await ensureDir(outputDir);
          const sitemapUrl = sitemapUrlArg ?? project.url.replace(/\/$/, '') + '/sitemap.xml';
          const files = await runSitemapDownload(sitemapUrl, outputDir, Number(options.maxDepth));
          const stats = computeStats(files);
          console.log('Sitemap download complete.');
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
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          process.stderr.write('Error: ' + message + '\n');
          process.exitCode = 1;
        } finally {
          await closeBrowser();
        }
      },
    );

  sitemap
    .command('stats')
    .argument('<name>', 'project name')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .option('--date <date>', 'date to look up (YYYY-MM-DD, "yesterday", "last-week")')
    .action(
      async (name: string, options: { projectsDir: string; date?: string }) => {
        try {
          const projectsDir = path.resolve(options.projectsDir);
          await loadProject(name, projectsDir);
          const dateDir = await resolveDate(name, options.date, projectsDir);
          const dir = dateDir + '/sitemaps/';
          const entries = await readdir(dir);
          const xmlFiles = entries.filter((f) => f.endsWith('.xml'));
          if (xmlFiles.length === 0) {
            process.stderr.write(
              `Error: no sitemap files found in ${dir}. Run "seo project sitemap download ${name}" first.\n`,
            );
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
          console.log('Sitemap statistics:');
          console.log(`  Output dir:     ${dir}`);
          console.log(`  Files saved:    ${files.length}`);
          console.log(`  Sub-sitemaps:   ${stats.subSitemapCount}`);
          console.log(`  Total URLs:     ${stats.totalUrls.toLocaleString()}`);
          if (stats.urlsPerSitemap.length > 0) {
            console.log('  URLs per sitemap:');
            for (const entry of stats.urlsPerSitemap) {
              console.log(`    ${entry.filename}  ${entry.urlCount}`);
            }
          }
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          process.stderr.write('Error: ' + message + '\n');
          process.exitCode = 1;
        }
      },
    );

  sitemap
    .command('search')
    .argument('<name>', 'project name')
    .argument('<keyword>', 'keyword to search for in sitemap URLs (substring match, case-insensitive)')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .option('--date <date>', 'date to look up (YYYY-MM-DD, "yesterday", "last-week")')
    .action(
      async (name: string, keyword: string, options: { projectsDir: string; date?: string }) => {
        try {
          const projectsDir = path.resolve(options.projectsDir);
          await loadProject(name, projectsDir);
          const dateDir = await resolveDate(name, options.date, projectsDir);
          const dir = dateDir + '/sitemaps/';
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
          process.stderr.write('Error: ' + message + '\n');
          process.exitCode = 1;
        }
      },
    );

  sitemap
    .command('audit')
    .argument('<name>', 'project name')
    .argument('[sitemap-url]', 'sitemap URL (defaults to <project-url>/sitemap.xml)')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .option('--max-depth <n>', 'maximum sitemap index recursion depth', '3')
    .option('--ignore-ssl', 'skip SSL certificate verification', false)
    .action(
      async (name: string, sitemapUrlArg: string | undefined, options: { projectsDir: string; maxDepth: string; ignoreSsl: boolean }) => {
        if (options.ignoreSsl) setIgnoreSsl(true);
        try {
          const projectsDir = path.resolve(options.projectsDir);
          const project = await loadProject(name, projectsDir);
          const dateStr = todayDateStr();
          const sitemapsDir = path.join(projectsDir, name, dateStr, 'sitemaps') + '/';
          const dateDir = path.join(projectsDir, name, dateStr);
          const sitemapUrl = sitemapUrlArg ?? project.url.replace(/\/$/, '') + '/sitemap.xml';

          // Step 1: Download sitemaps
          console.log('[sitemap-audit] Downloading sitemaps...');
          const files = await runSitemapDownload(sitemapUrl, sitemapsDir, Number(options.maxDepth));
          const stats = computeStats(files);
          console.log(`[sitemap-audit] Found ${stats.totalUrls.toLocaleString()} URLs across ${stats.subSitemapCount} sitemap(s)`);

          if (stats.totalUrls === 0) {
            process.stderr.write('Error: no URLs found in sitemaps. Nothing to audit.\n');
            process.exitCode = 1;
            return;
          }

          // Step 2: Extract all URLs from non-index sitemaps
          const allUrls: string[] = [];
          for (const file of files) {
            if (file.isIndex) continue;
            const content = await readFile(file.filePath, 'utf8');
            const locs = parseSitemapXml(content);
            for (const loc of locs) allUrls.push(loc);
          }

          // Step 3: Write URLs to sitemap-done.txt in the dated folder
          await ensureDir(dateDir);
          const doneFile = path.join(dateDir, 'sitemap-done.txt');
          await writeFile(doneFile, allUrls.join('\n') + '\n', 'utf8');
          console.log(`[sitemap-audit] Wrote ${allUrls.length} URLs to ${doneFile}`);

          // Step 4: Run audit with output = dated dir + sitemap-audit.csv
          const outputFile = path.join(dateDir, 'sitemap-audit.csv');
          console.log('[sitemap-audit] Running audit...');
          const result = await runAudit(doneFile, { output: outputFile, stateDir: dateDir });
          console.log(`[sitemap-audit] Audit complete. rows=${result.rowCount} errors=${result.errorCount} output=${outputFile}`);
        } catch (error) {
          const message = error instanceof Error ? error.message : String(error);
          process.stderr.write('Error: ' + message + '\n');
          process.exitCode = 1;
        } finally {
          await closeBrowser();
        }
      },
    );

  project.addCommand(sitemap);

  // diff subcommand
  project
    .command('diff')
    .argument('<name>', 'project name')
    .option('--projects-dir <path>', 'projects directory', './projects')
    .option('--from <date>', 'start date filter (YYYY-MM-DD, "yesterday", "last-week")')
    .option('--to <date>', 'end date filter (YYYY-MM-DD, "yesterday", "last-week")')
    .description('Generate and display diffs between chronological project snapshots')
    .action(async (name: string, options: { projectsDir: string; from?: string; to?: string }) => {
      try {
        const projectsDir = path.resolve(options.projectsDir);
        await loadProject(name, projectsDir);
        const projectDir = path.join(projectsDir, name);

        // Step 1: Generate all missing diffs
        console.log(`Generating diffs for project "${name}"...`);
        const result = await generateProjectDiffs(projectDir);

        if (result.generated.length === 0 && result.skipped.length === 0) {
          console.log('No diffs to generate (need at least 2 dated runs).');
          return;
        }

        console.log(`Generated: ${result.generated.length} diff(s), Skipped: ${result.skipped.length} (already exist)`);

        // Step 2: Read and display diffs
        const entries = await readdir(projectDir, { withFileTypes: true });
        const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
        let diffFolders = entries
          .filter((e) => e.isDirectory() && DATE_RE.test(e.name))
          .map((e) => e.name)
          .sort();

        // Apply --from / --to filters
        if (options.from) {
          const fromDate = options.from === 'yesterday'
            ? new Date(Date.now() - 86400000).toISOString().slice(0, 10)
            : options.from === 'last-week'
              ? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
              : options.from;
          diffFolders = diffFolders.filter((d) => d >= fromDate);
        }
        if (options.to) {
          const toDate = options.to === 'yesterday'
            ? new Date(Date.now() - 86400000).toISOString().slice(0, 10)
            : options.to === 'last-week'
              ? new Date(Date.now() - 7 * 86400000).toISOString().slice(0, 10)
              : options.to;
          diffFolders = diffFolders.filter((d) => d <= toDate);
        }

        // Filter to only folders that have diff.csv
        const foldersWithDiff: string[] = [];
        for (const folder of diffFolders) {
          try {
            await access(path.join(projectDir, folder, 'diff.csv'));
            foldersWithDiff.push(folder);
          } catch {
            // no diff.csv in this folder
          }
        }

        if (foldersWithDiff.length === 0) {
          console.log('No diffs available for the specified date range.');
          return;
        }

        // Default: show most recent 2 diffs
        const displayFolders = (!options.from && !options.to)
          ? foldersWithDiff.slice(-2)
          : foldersWithDiff;

        for (const folder of displayFolders) {
          const diffPath = path.join(projectDir, folder, 'diff.csv');
          const csvContent = await readFile(diffPath, 'utf8');
          const records = parse(csvContent, { columns: true }) as Array<Record<string, string>>;

          console.log(`\n--- Diff: ${folder} ---`);
          if (records.length === 0) {
            console.log('  No changes detected.');
            continue;
          }

          // Group by resourceType for display
          const byType = new Map<string, Array<Record<string, string>>>();
          for (const rec of records) {
            const arr = byType.get(rec.resourceType) ?? [];
            arr.push(rec);
            byType.set(rec.resourceType, arr);
          }

          for (const [resType, recs] of byType) {
            const added = recs.filter((r) => r.changeType === 'added').length;
            const removed = recs.filter((r) => r.changeType === 'removed').length;
            const changed = recs.filter((r) => r.changeType === 'changed').length;
            console.log(`  ${resType}: +${added} -${removed} ~${changed}`);
          }
          console.log(`  Total: ${records.length} change(s)`);
        }
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        process.stderr.write('Error: ' + message + '\n');
        process.exitCode = 1;
      }
    });

  return project;
}
