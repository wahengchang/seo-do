import type { AuditRecord, DiffRecord, RobotsDirective } from './types.js';

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
