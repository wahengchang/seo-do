import path from 'node:path';
import { writeFile } from 'node:fs/promises';
import { Command } from 'commander';
import { request } from 'undici';
import { parseRobotsTxt } from '../shared/robots.js';
import { writeRobotsCsv, ensureDir } from '../io/files.js';

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36';

function deriveRobotsUrl(input: string): string {
  if (input.endsWith('/robots.txt')) return input;
  const base = input.replace(/\/+$/, '');
  return `${base}/robots.txt`;
}

async function fetchRobotsTxt(robotsUrl: string, ignoreSsl: boolean): Promise<string> {
  const opts: Parameters<typeof request>[1] = {
    headers: { 'User-Agent': USER_AGENT },
  };
  if (ignoreSsl) {
    opts.dispatcher = new (await import('undici')).Agent({
      connect: { rejectUnauthorized: false },
    });
  }

  const { statusCode, body } = await request(robotsUrl, opts);

  if (statusCode < 200 || statusCode >= 300) {
    throw new Error(`HTTP ${statusCode}`);
  }

  return body.text();
}

export function robotsCommand(): Command {
  const robots = new Command('robots').description('Download and audit robots.txt');

  robots
    .command('download')
    .argument('<url>', 'URL to fetch robots.txt from (domain or full robots.txt URL)')
    .option('--output <file>', 'output file for raw robots.txt content', './state/robots.txt')
    .option('--ignore-ssl', 'skip SSL certificate verification', false)
    .action(async (url: string, opts: { output: string; ignoreSsl: boolean }) => {
      const robotsUrl = deriveRobotsUrl(url);
      console.log(`Fetching ${robotsUrl}...`);

      try {
        const body = await fetchRobotsTxt(robotsUrl, opts.ignoreSsl);
        await ensureDir(path.dirname(opts.output));
        await writeFile(opts.output, body, 'utf8');
        console.log(`Saved robots.txt to ${opts.output} (${body.length} bytes)`);
      } catch (err) {
        console.error(`Error: Failed to fetch ${robotsUrl} (${(err as Error).message})`);
        process.exitCode = 1;
      }
    });

  robots
    .command('audit')
    .argument('<url>', 'URL to fetch robots.txt from (domain or full robots.txt URL)')
    .option('--output <file>', 'CSV output file', './state/robots-audit.csv')
    .option('--ignore-ssl', 'skip SSL certificate verification', false)
    .action(async (url: string, opts: { output: string; ignoreSsl: boolean }) => {
      const robotsUrl = deriveRobotsUrl(url);
      console.log(`Fetching ${robotsUrl}...`);

      try {
        const body = await fetchRobotsTxt(robotsUrl, opts.ignoreSsl);
        const directives = parseRobotsTxt(body);
        await ensureDir(path.dirname(opts.output));
        await writeRobotsCsv(opts.output, directives);
        console.log(`Robots audit complete. ${directives.length} directives found. Output: ${opts.output}`);
      } catch (err) {
        console.error(`Error: Failed to fetch ${robotsUrl} (${(err as Error).message})`);
        process.exitCode = 1;
      }
    });

  return robots;
}
