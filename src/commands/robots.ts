import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import { parseRobotsTxt } from '../shared/robots.js';
import { writeRobotsCsv, ensureDir } from '../io/files.js';

function deriveRobotsUrl(input: string): string {
  if (input.endsWith('/robots.txt')) return input;
  const base = input.replace(/\/+$/, '');
  return `${base}/robots.txt`;
}

export function robotsCommand(): Command {
  const robots = new Command('robots').description('Download and audit robots.txt');

  robots
    .command('download')
    .argument('<url>', 'URL to fetch robots.txt from (domain or full robots.txt URL)')
    .option('--output <file>', 'output file for raw robots.txt content', './state/robots.txt')
    .action(async (url: string, opts: { output: string }) => {
      const robotsUrl = deriveRobotsUrl(url);
      console.log(`Fetching ${robotsUrl}...`);

      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': 'seo-audit-cli/2.1' },
      });

      if (!response.ok) {
        console.error(`Error: Failed to fetch ${robotsUrl} (HTTP ${response.status})`);
        process.exitCode = 1;
        return;
      }

      const body = await response.text();
      await ensureDir(path.dirname(opts.output));
      await writeFile(opts.output, body, 'utf8');
      console.log(`Saved robots.txt to ${opts.output} (${body.length} bytes)`);
    });

  robots
    .command('audit')
    .argument('<url>', 'URL to fetch robots.txt from (domain or full robots.txt URL)')
    .option('--output <file>', 'CSV output file', './state/robots-audit.csv')
    .action(async (url: string, opts: { output: string }) => {
      const robotsUrl = deriveRobotsUrl(url);
      console.log(`Fetching ${robotsUrl}...`);

      const response = await fetch(robotsUrl, {
        headers: { 'User-Agent': 'seo-audit-cli/2.1' },
      });

      if (!response.ok) {
        console.error(`Error: Failed to fetch ${robotsUrl} (HTTP ${response.status})`);
        process.exitCode = 1;
        return;
      }

      const body = await response.text();
      const directives = parseRobotsTxt(body);
      await ensureDir(path.dirname(opts.output));
      await writeRobotsCsv(opts.output, directives);
      console.log(`Robots audit complete. ${directives.length} directives found. Output: ${opts.output}`);
    });

  return robots;
}
