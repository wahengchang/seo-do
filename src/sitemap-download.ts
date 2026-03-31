import path from 'node:path';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { Agent, request, interceptors } from 'undici';
import { parseSitemapXml, isSitemapIndex } from './shared/sitemap.js';
import { normalizeUrl } from './shared/url.js';
import { ensureDir } from './io/files.js';

let ignoreSsl = false;

export function setIgnoreSsl(value: boolean): void {
  ignoreSsl = value;
}

function createDispatcher(): ReturnType<Agent['compose']> {
  const connectOpts = ignoreSsl ? { rejectUnauthorized: false } : {};
  const agent = new Agent({ connect: connectOpts });
  return agent.compose(interceptors.redirect({ maxRedirections: 5 }));
}

async function fetchRawXml(url: string): Promise<{ statusCode: number; body: string }> {
  process.stderr.write(`[sitemap] Fetching ${url} ...\n`);
  const { statusCode, body } = await request(url, {
    headers: {
      'user-agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36',
      'accept': 'application/xml, text/xml, */*',
    },
    dispatcher: createDispatcher(),
    headersTimeout: 30_000,
    bodyTimeout: 60_000,
  });
  const text = await body.text();
  process.stderr.write(`[sitemap] HTTP ${statusCode} — ${(text.length / 1024).toFixed(1)} KB\n`);
  return { statusCode, body: text };
}

export interface SitemapFile {
  url: string;
  filename: string;
  isIndex: boolean;
  urlCount: number;
  filePath: string;
}

export interface SitemapStats {
  totalUrls: number;
  subSitemapCount: number;
  urlsPerSitemap: Array<{ filename: string; urlCount: number }>;
}

function urlToFilename(url: string, index: number): string {
  const parsed = new URL(url);
  const base = path.basename(parsed.pathname) || 'sitemap.xml';
  return `${String(index).padStart(2, '0')}-${base}`;
}

export async function runSitemapDownload(
  rootUrl: string,
  outputDir: string,
  maxDepth: number = 3,
): Promise<SitemapFile[]> {
  await ensureDir(outputDir);
  const files: SitemapFile[] = [];
  const visited = new Set<string>();
  await fetchAndSave(rootUrl, outputDir, files, 0, visited, 0, maxDepth);
  return files;
}

async function fetchAndSave(
  url: string,
  outputDir: string,
  files: SitemapFile[],
  index: number,
  visited: Set<string>,
  depth: number,
  maxDepth: number,
): Promise<number> {
  if (visited.has(url)) return index;
  visited.add(url);

  const resp = await fetchRawXml(url);
  if (resp.statusCode !== 200) {
    process.stderr.write(`[sitemap] HTTP ${resp.statusCode} for ${url}, skipping\n`);
    return index;
  }

  const filename = urlToFilename(url, index);
  const filePath = path.join(outputDir, filename);
  await writeFile(filePath, resp.body, 'utf8');

  const locs = parseSitemapXml(resp.body);
  const isIndex = isSitemapIndex(resp.body);

  files.push({
    url,
    filename,
    isIndex,
    urlCount: isIndex ? 0 : locs.length,
    filePath,
  });

  if (isIndex && depth < maxDepth) {
    let nextIndex = index + 1;
    for (const childUrl of locs) {
      nextIndex = await fetchAndSave(childUrl, outputDir, files, nextIndex, visited, depth + 1, maxDepth);
    }
    return nextIndex;
  }

  return index + 1;
}

export function computeStats(files: SitemapFile[]): SitemapStats {
  const leafFiles = files.filter((f) => !f.isIndex);
  return {
    totalUrls: leafFiles.reduce((sum, f) => sum + f.urlCount, 0),
    subSitemapCount: leafFiles.length,
    urlsPerSitemap: leafFiles.map((f) => ({ filename: f.filename, urlCount: f.urlCount })),
  };
}

export async function searchSitemapDir(
  dir: string,
  targetUrl: string,
): Promise<{ found: boolean; foundIn: string[] }> {
  const entries = await readdir(dir);
  const xmlFiles = entries.filter((f) => f.endsWith('.xml'));
  const foundIn: string[] = [];

  // Normalize target URL
  let normalizedTarget: string;
  try {
    const targetParsed = new URL(targetUrl);
    const targetOrigin = targetParsed.origin;
    normalizedTarget = normalizeUrl(targetUrl, targetOrigin + '/', targetOrigin) ?? targetUrl;
  } catch {
    normalizedTarget = targetUrl;
  }

  for (const xmlFile of xmlFiles) {
    const content = await readFile(path.join(dir, xmlFile), 'utf8');
    const locs = parseSitemapXml(content);

    for (const loc of locs) {
      let normalizedLoc: string;
      try {
        const locParsed = new URL(loc);
        const locOrigin = locParsed.origin;
        normalizedLoc = normalizeUrl(loc, locOrigin + '/', locOrigin) ?? loc;
      } catch {
        normalizedLoc = loc;
      }

      if (normalizedLoc === normalizedTarget) {
        foundIn.push(xmlFile);
        break;
      }
    }
  }

  return { found: foundIn.length > 0, foundIn };
}

export interface GrepResult {
  matchCount: number;
  matches: Array<{ url: string; file: string }>;
}

export async function grepSitemapDir(
  dir: string,
  keyword: string,
): Promise<GrepResult> {
  const entries = await readdir(dir);
  const xmlFiles = entries.filter((f) => f.endsWith('.xml'));
  const matches: Array<{ url: string; file: string }> = [];
  const lowerKeyword = keyword.toLowerCase();

  for (const xmlFile of xmlFiles) {
    const content = await readFile(path.join(dir, xmlFile), 'utf8');
    if (isSitemapIndex(content)) continue;
    const locs = parseSitemapXml(content);

    for (const loc of locs) {
      if (loc.toLowerCase().includes(lowerKeyword)) {
        matches.push({ url: loc, file: xmlFile });
      }
    }
  }

  return { matchCount: matches.length, matches };
}
