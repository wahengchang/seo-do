import { createHash } from 'node:crypto';
import { readFile, writeFile, mkdir } from 'node:fs/promises';
import path from 'node:path';
import { fetchPage } from './http.js';
import type { FetchPageResult } from '../types.js';

function urlToFilename(url: string): string {
  const hash = createHash('sha256').update(url).digest('hex').slice(0, 16);
  // Use a readable prefix from the URL path
  const parsed = new URL(url);
  const slug = parsed.pathname.replace(/[^a-zA-Z0-9]/g, '_').slice(0, 80);
  return `${slug}_${hash}`;
}

interface CachedPage {
  result: FetchPageResult;
}

export async function fetchPageCached(url: string, htmlDir: string): Promise<FetchPageResult> {
  await mkdir(htmlDir, { recursive: true });

  const basename = urlToFilename(url);
  const metaPath = path.join(htmlDir, `${basename}.json`);
  const htmlPath = path.join(htmlDir, `${basename}.html`);

  // Try cache first
  try {
    const meta = JSON.parse(await readFile(metaPath, 'utf8')) as CachedPage;
    const body = await readFile(htmlPath, 'utf8');
    console.log(`[cache] hit  ${url}`);
    return { ...meta.result, body };
  } catch {
    // Cache miss — fetch from network
  }

  console.log(`[cache] miss ${url}`);
  const result = await fetchPage(url);

  // Save to cache
  const { body, ...meta } = result;
  await writeFile(metaPath, JSON.stringify({ result: meta }, null, 2), 'utf8');
  await writeFile(htmlPath, body, 'utf8');

  return result;
}
