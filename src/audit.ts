import { writeAuditCsv, appendErrors, ensureDir } from './io/files.js';
import { fetchPage } from './shared/http.js';
import { buildAuditRecord } from './extractors/audit-record.js';
import { getStatePaths } from './state.js';
import type { AuditOptions, AuditRecord, ErrorRecord } from './types.js';
import { readFile } from 'node:fs/promises';
import path from 'node:path';

export async function runAudit(inputFile: string, options: AuditOptions): Promise<{ rowCount: number; errorCount: number }> {
  const content = await readFile(inputFile, 'utf8');
  const urls = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (urls.length === 0) {
    throw new Error(`No URLs found in ${inputFile}`);
  }

  const origin = options.origin ?? new URL(urls[0]).origin;
  const rows: AuditRecord[] = [];
  const errorRecords: ErrorRecord[] = [];
  const stateDir = options.stateDir ?? getStatePaths('state').stateDir;
  const errorFile = getStatePaths(stateDir).errorFile;

  for (const url of urls) {
    try {
      const page = await fetchPage(url);
      rows.push(buildAuditRecord(page, origin));
    } catch (error) {
      errorRecords.push({
        url,
        stage: 'audit',
        message: error instanceof Error ? error.message : String(error),
      });
    }
  }

  await ensureDir(path.dirname(options.output));
  await writeAuditCsv(options.output, rows);
  await appendErrors(errorFile, errorRecords);

  return { rowCount: rows.length, errorCount: errorRecords.length };
}
