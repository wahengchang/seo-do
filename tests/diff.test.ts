import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { mkdir, writeFile, readFile, rm } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { diffPages, diffRobots, diffSitemaps, generateProjectDiffs } from '../src/diff.js';
import { writeDiffCsv } from '../src/io/files.js';
import type { AuditRecord, RobotsDirective } from '../src/types.js';

function makeAuditRecord(overrides: Partial<AuditRecord> = {}): AuditRecord {
  return {
    url: 'https://example.com/',
    title: 'Example',
    description: 'Desc',
    canonical: 'https://example.com/',
    isRedirect: 'FALSE',
    h1Count: 1,
    h1Text: 'Hello',
    h2Count: 0,
    h2Text: '',
    h3Count: 0,
    h3Text: '',
    size: 1234,
    ga4Count: 0,
    ga4Ids: '',
    gtmCount: 0,
    gtmIds: '',
    isBreadcrumb: 'FALSE',
    isBlogPosting: 'FALSE',
    isArticle: 'FALSE',
    isFaq: 'FALSE',
    isLogo: 'FALSE',
    isSsr: 'TRUE',
    countStructureData: 0,
    ...overrides,
  };
}

describe('diffPages', () => {
  it('detects added URLs', () => {
    const older: AuditRecord[] = [];
    const newer = [makeAuditRecord({ url: 'https://example.com/new' })];
    const result = diffPages(older, newer);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      resourceType: 'pages',
      changeType: 'added',
      url: 'https://example.com/new',
      field: '',
      oldValue: '',
      newValue: 'https://example.com/new',
    });
  });

  it('detects removed URLs', () => {
    const older = [makeAuditRecord({ url: 'https://example.com/gone' })];
    const newer: AuditRecord[] = [];
    const result = diffPages(older, newer);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      resourceType: 'pages',
      changeType: 'removed',
      url: 'https://example.com/gone',
      field: '',
      oldValue: 'https://example.com/gone',
      newValue: '',
    });
  });

  it('detects changed title', () => {
    const older = [makeAuditRecord({ url: 'https://example.com/', title: 'Old Title' })];
    const newer = [makeAuditRecord({ url: 'https://example.com/', title: 'New Title' })];
    const result = diffPages(older, newer);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      resourceType: 'pages',
      changeType: 'changed',
      url: 'https://example.com/',
      field: 'title',
      oldValue: 'Old Title',
      newValue: 'New Title',
    });
  });

  it('emits one DiffRecord per changed field', () => {
    const older = [makeAuditRecord({ url: 'https://example.com/', title: 'Old', description: 'Old desc' })];
    const newer = [makeAuditRecord({ url: 'https://example.com/', title: 'New', description: 'New desc' })];
    const result = diffPages(older, newer);
    expect(result).toHaveLength(2);
    const fields = result.map((r) => r.field).sort();
    expect(fields).toEqual(['description', 'title']);
  });

  it('emits nothing when URLs match with no changes', () => {
    const record = makeAuditRecord();
    const result = diffPages([record], [{ ...record }]);
    expect(result).toHaveLength(0);
  });

  it('returns empty array for empty inputs', () => {
    expect(diffPages([], [])).toEqual([]);
  });
});

describe('diffRobots', () => {
  it('detects added directives', () => {
    const older: RobotsDirective[] = [];
    const newer: RobotsDirective[] = [{ userAgent: '*', directive: 'Disallow', value: '/admin' }];
    const result = diffRobots(older, newer);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      resourceType: 'robots',
      changeType: 'added',
      url: '*',
      field: 'Disallow',
      newValue: '/admin',
    });
  });

  it('detects removed directives', () => {
    const older: RobotsDirective[] = [{ userAgent: '*', directive: 'Disallow', value: '/secret' }];
    const newer: RobotsDirective[] = [];
    const result = diffRobots(older, newer);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      resourceType: 'robots',
      changeType: 'removed',
      url: '*',
      field: 'Disallow',
      oldValue: '/secret',
    });
  });

  it('emits nothing for identical directives', () => {
    const d: RobotsDirective = { userAgent: '*', directive: 'Allow', value: '/' };
    expect(diffRobots([d], [d])).toHaveLength(0);
  });

  it('uses composite key: userAgent+directive+value', () => {
    const older: RobotsDirective[] = [{ userAgent: '*', directive: 'Disallow', value: '/a' }];
    const newer: RobotsDirective[] = [{ userAgent: '*', directive: 'Disallow', value: '/b' }];
    const result = diffRobots(older, newer);
    // /a removed, /b added = 2 records
    expect(result).toHaveLength(2);
    expect(result.find((r) => r.changeType === 'removed')?.oldValue).toBe('/a');
    expect(result.find((r) => r.changeType === 'added')?.newValue).toBe('/b');
  });
});

describe('diffSitemaps', () => {
  it('detects added URLs', () => {
    const result = diffSitemaps([], ['https://example.com/new']);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      resourceType: 'sitemap',
      changeType: 'added',
      url: 'https://example.com/new',
      field: '',
      newValue: 'https://example.com/new',
    });
  });

  it('detects removed URLs', () => {
    const result = diffSitemaps(['https://example.com/old'], []);
    expect(result).toHaveLength(1);
    expect(result[0]).toMatchObject({
      resourceType: 'sitemap',
      changeType: 'removed',
      url: 'https://example.com/old',
      field: '',
      oldValue: 'https://example.com/old',
    });
  });

  it('emits nothing for same URLs', () => {
    expect(diffSitemaps(['https://example.com/'], ['https://example.com/'])).toHaveLength(0);
  });
});

describe('writeDiffCsv', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `diff-test-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  it('writes CSV with correct header and rows', async () => {
    const outPath = join(tmpDir, 'diff.csv');
    await writeDiffCsv(outPath, [
      { resourceType: 'pages', url: 'https://example.com/', changeType: 'added', field: '', oldValue: '', newValue: 'https://example.com/' },
    ]);
    const content = await readFile(outPath, 'utf8');
    const lines = content.trim().split('\n');
    expect(lines[0]).toBe('resourceType,url,changeType,field,oldValue,newValue');
    expect(lines).toHaveLength(2);
  });
});

describe('generateProjectDiffs', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = join(tmpdir(), `diff-proj-${Date.now()}-${Math.random().toString(36).slice(2)}`);
    await mkdir(tmpDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  function writeAuditCsvRaw(dir: string, rows: string): Promise<void> {
    return writeFile(join(dir, 'audit.csv'), rows, 'utf8');
  }

  function writeRobotsCsvRaw(dir: string, rows: string): Promise<void> {
    return writeFile(join(dir, 'robots-audit.csv'), rows, 'utf8');
  }

  async function writeSitemapXml(dir: string, urls: string[]): Promise<void> {
    const sitemapsDir = join(dir, 'sitemaps');
    await mkdir(sitemapsDir, { recursive: true });
    const xml = `<?xml version="1.0"?>\n<urlset>${urls.map((u) => `<url><loc>${u}</loc></url>`).join('')}</urlset>`;
    await writeFile(join(sitemapsDir, 'sitemap.xml'), xml, 'utf8');
  }

  it('produces diff.csv for two date folders with audit.csv', async () => {
    const older = join(tmpDir, '2026-01-01');
    const newer = join(tmpDir, '2026-01-02');
    await mkdir(older, { recursive: true });
    await mkdir(newer, { recursive: true });

    const header = 'url,title,description,canonical,isRedirect,h1Count,h1Text,h2Count,h2Text,h3Count,h3Text,size,ga4Count,ga4Ids,gtmCount,gtmIds,isBreadcrumb,isBlogPosting,isArticle,isFaq,isLogo,isSsr,countStructureData\n';
    await writeAuditCsvRaw(older, header + 'https://example.com/,Old Title,Desc,https://example.com/,FALSE,1,Hello,0,,0,,1234,0,,0,,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,0\n');
    await writeAuditCsvRaw(newer, header + 'https://example.com/,New Title,Desc,https://example.com/,FALSE,1,Hello,0,,0,,1234,0,,0,,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,0\n');

    const result = await generateProjectDiffs(tmpDir);
    expect(result.generated).toHaveLength(1);
    expect(result.generated[0]).toContain('2026-01-02');

    const diffContent = await readFile(join(newer, 'diff.csv'), 'utf8');
    expect(diffContent).toContain('changed');
    expect(diffContent).toContain('title');
  });

  it('returns empty for single date folder', async () => {
    await mkdir(join(tmpDir, '2026-01-01'), { recursive: true });
    const result = await generateProjectDiffs(tmpDir);
    expect(result.generated).toHaveLength(0);
    expect(result.skipped).toHaveLength(0);
  });

  it('skips when diff.csv already exists', async () => {
    const older = join(tmpDir, '2026-01-01');
    const newer = join(tmpDir, '2026-01-02');
    await mkdir(older, { recursive: true });
    await mkdir(newer, { recursive: true });

    const header = 'url,title,description,canonical,isRedirect,h1Count,h1Text,h2Count,h2Text,h3Count,h3Text,size,ga4Count,ga4Ids,gtmCount,gtmIds,isBreadcrumb,isBlogPosting,isArticle,isFaq,isLogo,isSsr,countStructureData\n';
    await writeAuditCsvRaw(older, header + 'https://example.com/,Title,Desc,https://example.com/,FALSE,1,Hello,0,,0,,1234,0,,0,,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,0\n');
    await writeAuditCsvRaw(newer, header + 'https://example.com/,Title,Desc,https://example.com/,FALSE,1,Hello,0,,0,,1234,0,,0,,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,0\n');

    // Pre-create diff.csv
    await writeFile(join(newer, 'diff.csv'), 'existing', 'utf8');

    const result = await generateProjectDiffs(tmpDir);
    expect(result.generated).toHaveLength(0);
    expect(result.skipped).toHaveLength(1);
  });

  it('skips pages comparison when audit.csv is missing', async () => {
    const older = join(tmpDir, '2026-01-01');
    const newer = join(tmpDir, '2026-01-02');
    await mkdir(older, { recursive: true });
    await mkdir(newer, { recursive: true });

    // Only newer has audit.csv, older does not
    const header = 'url,title,description,canonical,isRedirect,h1Count,h1Text,h2Count,h2Text,h3Count,h3Text,size,ga4Count,ga4Ids,gtmCount,gtmIds,isBreadcrumb,isBlogPosting,isArticle,isFaq,isLogo,isSsr,countStructureData\n';
    await writeAuditCsvRaw(newer, header + 'https://example.com/,Title,Desc,https://example.com/,FALSE,1,Hello,0,,0,,1234,0,,0,,FALSE,FALSE,FALSE,FALSE,FALSE,TRUE,0\n');

    const result = await generateProjectDiffs(tmpDir);
    expect(result.generated).toHaveLength(1);
    // diff.csv should exist but be empty (only header) since pages was skipped and no robots/sitemap
    const diffContent = await readFile(join(newer, 'diff.csv'), 'utf8');
    expect(diffContent).toContain('resourceType');
  });

  it('skips robots comparison when robots CSV is missing', async () => {
    const older = join(tmpDir, '2026-01-01');
    const newer = join(tmpDir, '2026-01-02');
    await mkdir(older, { recursive: true });
    await mkdir(newer, { recursive: true });

    // No robots-audit.csv in either folder, no audit.csv either
    const result = await generateProjectDiffs(tmpDir);
    expect(result.generated).toHaveLength(1);
  });

  it('skips sitemap comparison when sitemaps dir is missing', async () => {
    const older = join(tmpDir, '2026-01-01');
    const newer = join(tmpDir, '2026-01-02');
    await mkdir(older, { recursive: true });
    await mkdir(newer, { recursive: true });

    // No sitemaps directory
    const result = await generateProjectDiffs(tmpDir);
    expect(result.generated).toHaveLength(1);
  });

  it('handles robots diff between two folders', async () => {
    const older = join(tmpDir, '2026-01-01');
    const newer = join(tmpDir, '2026-01-02');
    await mkdir(older, { recursive: true });
    await mkdir(newer, { recursive: true });

    await writeRobotsCsvRaw(older, 'userAgent,directive,value\n*,Disallow,/old\n');
    await writeRobotsCsvRaw(newer, 'userAgent,directive,value\n*,Disallow,/new\n');

    const result = await generateProjectDiffs(tmpDir);
    expect(result.generated).toHaveLength(1);
    const diffContent = await readFile(join(newer, 'diff.csv'), 'utf8');
    expect(diffContent).toContain('robots');
  });

  it('handles sitemap diff between two folders', async () => {
    const older = join(tmpDir, '2026-01-01');
    const newer = join(tmpDir, '2026-01-02');
    await mkdir(older, { recursive: true });
    await mkdir(newer, { recursive: true });

    await writeSitemapXml(older, ['https://example.com/a']);
    await writeSitemapXml(newer, ['https://example.com/b']);

    const result = await generateProjectDiffs(tmpDir);
    expect(result.generated).toHaveLength(1);
    const diffContent = await readFile(join(newer, 'diff.csv'), 'utf8');
    expect(diffContent).toContain('sitemap');
  });
});
