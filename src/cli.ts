#!/usr/bin/env node
import { Command } from 'commander';
import { pagesCommand } from './commands/pages.js';
import { sitemapCommand } from './commands/sitemap.js';
import { projectCommand } from './commands/project.js';

const program = new Command();

program.name('seo').description('Personal SEO crawl and audit CLI for small websites');

program.addCommand(pagesCommand());
program.addCommand(sitemapCommand());
program.addCommand(projectCommand());

program.parseAsync(process.argv).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exitCode = 1;
});
