import { Command } from 'commander';
import { crawlCommand } from './crawl.js';
import { auditCommand } from './audit.js';

export function pagesCommand(): Command {
  const pages = new Command('pages').description('Link-following crawl and page audit');

  pages
    .command('crawl')
    .argument('<url>', 'seed URL to crawl')
    .option('--state-dir <path>', 'directory for crawl state files', './state')
    .option('--max-pages <number>', 'maximum pages to crawl', '100')
    .action(async (url: string, options: { stateDir: string; maxPages: string }) => {
      await crawlCommand(url, options);
    });

  pages
    .command('audit')
    .argument('<input-file>', 'file containing one URL per line')
    .option('--output <file>', 'CSV output file', './state/audit.csv')
    .option('--origin <url>', 'origin override for same-site calculations')
    .action(async (inputFile: string, options: { output: string; origin?: string }) => {
      await auditCommand(inputFile, options);
    });

  return pages;
}
