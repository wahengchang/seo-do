import { describe, it, expect } from 'vitest';
import { diffPages, diffRobots, diffSitemaps } from '../src/diff.js';
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
