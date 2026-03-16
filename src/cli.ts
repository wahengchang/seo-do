#!/usr/bin/env node
import { Command } from 'commander';
import { auditCommand } from './commands/audit.js';
import { crawlCommand } from './commands/crawl.js';

const program = new Command();

program.name('seo').description('Personal SEO crawl and audit CLI for small websites');

program
  .command('crawl')
  .argument('<url>', 'seed URL to crawl')
  .option('--state-dir <path>', 'directory for crawl state files', './state')
  .option('--max-pages <number>', 'maximum pages to crawl', '100')
  .action(async (url, options) => {
    await crawlCommand(url, options);
  });

program
  .command('audit')
  .argument('<input-file>', 'file containing one URL per line')
  .option('--output <file>', 'CSV output file', './state/audit.csv')
  .option('--origin <url>', 'origin override for same-site calculations')
  .action(async (inputFile, options) => {
    await auditCommand(inputFile, options);
  });

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
