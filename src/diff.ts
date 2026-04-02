import { readdir, readFile, access } from 'node:fs/promises';
import path from 'node:path';
import { parse } from 'csv-parse/sync';
import type { AuditRecord, DiffRecord, RobotsDirective } from './types.js';
import { writeDiffCsv } from './io/files.js';
import { isSitemapIndex, parseSitemapXml } from './shared/sitemap.js';

const DATE_FOLDER_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Compare two sets of AuditRecords and produce per-field diff records.
 * Added/removed URLs get a single row; changed URLs get one row per changed field.
 */
export function diffPages(older: AuditRecord[], newer: AuditRecord[]): DiffRecord[] {
  const olderMap = new Map<string, AuditRecord>();
  for (const r of older) olderMap.set(r.url, r);

  const newerMap = new Map<string, AuditRecord>();
  for (const r of newer) newerMap.set(r.url, r);

  const diffs: DiffRecord[] = [];

  // Added URLs (in newer but not older)
  for (const [url] of newerMap) {
    if (!olderMap.has(url)) {
      diffs.push({
        resourceType: 'pages',
        url,
        changeType: 'added',
        field: '',
        oldValue: '',
        newValue: url,
      });
    }
  }

  // Removed URLs (in older but not newer)
  for (const [url] of olderMap) {
    if (!newerMap.has(url)) {
      diffs.push({
        resourceType: 'pages',
        url,
        changeType: 'removed',
        field: '',
        oldValue: url,
        newValue: '',
      });
    }
  }

  // Changed fields (URL in both)
  for (const [url, olderRec] of olderMap) {
    const newerRec = newerMap.get(url);
    if (!newerRec) continue;

    for (const key of Object.keys(olderRec) as Array<keyof AuditRecord>) {
      if (key === 'url') continue;
      const oldVal = String(olderRec[key]);
      const newVal = String(newerRec[key]);
      if (oldVal !== newVal) {
        diffs.push({
          resourceType: 'pages',
          url,
          changeType: 'changed',
          field: key,
          oldValue: oldVal,
          newValue: newVal,
        });
      }
    }
  }

  return diffs;
}

/**
 * Compare two sets of RobotsDirectives using composite key (userAgent|directive|value).
 * Directives are atomic -- they are either present or absent, no "changed" type.
 */
export function diffRobots(older: RobotsDirective[], newer: RobotsDirective[]): DiffRecord[] {
  const toKey = (d: RobotsDirective) => `${d.userAgent}|${d.directive}|${d.value}`;

  const olderKeys = new Map<string, RobotsDirective>();
  for (const d of older) olderKeys.set(toKey(d), d);

  const newerKeys = new Map<string, RobotsDirective>();
  for (const d of newer) newerKeys.set(toKey(d), d);

  const diffs: DiffRecord[] = [];

  // Added directives
  for (const [key, d] of newerKeys) {
    if (!olderKeys.has(key)) {
      diffs.push({
        resourceType: 'robots',
        url: d.userAgent,
        changeType: 'added',
        field: d.directive,
        oldValue: '',
        newValue: d.value,
      });
    }
  }

  // Removed directives
  for (const [key, d] of olderKeys) {
    if (!newerKeys.has(key)) {
      diffs.push({
        resourceType: 'robots',
        url: d.userAgent,
        changeType: 'removed',
        field: d.directive,
        oldValue: d.value,
        newValue: '',
      });
    }
  }

  return diffs;
}

/**
 * Compare two sets of sitemap URLs using set difference.
 */
export function diffSitemaps(older: string[], newer: string[]): DiffRecord[] {
  const olderSet = new Set(older);
  const newerSet = new Set(newer);

  const diffs: DiffRecord[] = [];

  // Added URLs
  for (const url of newerSet) {
    if (!olderSet.has(url)) {
      diffs.push({
        resourceType: 'sitemap',
        url,
        changeType: 'added',
        field: '',
        oldValue: '',
        newValue: url,
      });
    }
  }

  // Removed URLs
  for (const url of olderSet) {
    if (!newerSet.has(url)) {
      diffs.push({
        resourceType: 'sitemap',
        url,
        changeType: 'removed',
        field: '',
        oldValue: url,
        newValue: '',
      });
    }
  }

  return diffs;
}

// --- CSV reading helpers ---

async function fileExists(filePath: string): Promise<boolean> {
  try {
    await access(filePath);
    return true;
  } catch {
    return false;
  }
}

export async function readAuditCsv(filePath: string): Promise<AuditRecord[]> {
  const content = await readFile(filePath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true }) as AuditRecord[];
}

export async function readRobotsCsv(filePath: string): Promise<RobotsDirective[]> {
  const content = await readFile(filePath, 'utf8');
  return parse(content, { columns: true, skip_empty_lines: true }) as RobotsDirective[];
}

export async function readSitemapUrls(sitemapsDir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(sitemapsDir);
  } catch {
    return [];
  }

  const xmlFiles = entries.filter((f) => f.endsWith('.xml'));
  const allUrls: string[] = [];

  for (const file of xmlFiles) {
    const content = await readFile(path.join(sitemapsDir, file), 'utf8');
    if (isSitemapIndex(content)) continue;
    const urls = parseSitemapXml(content);
    allUrls.push(...urls);
  }

  return allUrls;
}

// --- Orchestrator ---

export async function generateProjectDiffs(
  projectDir: string,
): Promise<{ generated: string[]; skipped: string[] }> {
  // Enumerate date folders
  let entries;
  try {
    entries = await readdir(projectDir, { withFileTypes: true });
  } catch {
    return { generated: [], skipped: [] };
  }

  const dateFolders = entries
    .filter((e) => e.isDirectory() && DATE_FOLDER_RE.test(e.name))
    .map((e) => e.name)
    .sort();

  if (dateFolders.length < 2) {
    return { generated: [], skipped: [] };
  }

  const generated: string[] = [];
  const skipped: string[] = [];

  for (let i = 1; i < dateFolders.length; i++) {
    const olderDir = path.join(projectDir, dateFolders[i - 1]);
    const newerDir = path.join(projectDir, dateFolders[i]);
    const diffPath = path.join(newerDir, 'diff.csv');

    // Skip if diff.csv already exists (idempotent)
    if (await fileExists(diffPath)) {
      skipped.push(diffPath);
      continue;
    }

    const allDiffs: DiffRecord[] = [];

    // Pages comparison
    const olderAudit = path.join(olderDir, 'audit.csv');
    const newerAudit = path.join(newerDir, 'audit.csv');
    if ((await fileExists(olderAudit)) && (await fileExists(newerAudit))) {
      const olderRecords = await readAuditCsv(olderAudit);
      const newerRecords = await readAuditCsv(newerAudit);
      allDiffs.push(...diffPages(olderRecords, newerRecords));
    }

    // Robots comparison
    const olderRobots = path.join(olderDir, 'robots-audit.csv');
    const newerRobots = path.join(newerDir, 'robots-audit.csv');
    if ((await fileExists(olderRobots)) && (await fileExists(newerRobots))) {
      const olderDirectives = await readRobotsCsv(olderRobots);
      const newerDirectives = await readRobotsCsv(newerRobots);
      allDiffs.push(...diffRobots(olderDirectives, newerDirectives));
    }

    // Sitemap comparison
    const olderSitemaps = path.join(olderDir, 'sitemaps');
    const newerSitemaps = path.join(newerDir, 'sitemaps');
    if ((await fileExists(olderSitemaps)) && (await fileExists(newerSitemaps))) {
      const olderUrls = await readSitemapUrls(olderSitemaps);
      const newerUrls = await readSitemapUrls(newerSitemaps);
      allDiffs.push(...diffSitemaps(olderUrls, newerUrls));
    }

    await writeDiffCsv(diffPath, allDiffs);
    generated.push(diffPath);
  }

  return { generated, skipped };
}
