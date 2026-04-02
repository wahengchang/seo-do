import { mkdir, readFile, writeFile, appendFile } from 'node:fs/promises';
import { dirname } from 'node:path';
import { stringify } from 'csv-stringify/sync';
import { AUDIT_COLUMNS, DIFF_COLUMNS, ROBOTS_COLUMNS } from '../constants.js';
import type { AuditRecord, DiffRecord, ErrorRecord, RobotsDirective, SkippedRecord, StatePaths } from '../types.js';

export async function ensureDir(dir: string): Promise<void> {
  await mkdir(dir, { recursive: true });
}

export async function ensureStateFiles(paths: StatePaths): Promise<void> {
  await ensureDir(paths.stateDir);
  await Promise.all([
    touchFile(paths.queueFile),
    touchFile(paths.doneFile),
    touchFile(paths.skippedFile),
    touchFile(paths.errorFile),
  ]);
}

async function touchFile(filePath: string): Promise<void> {
  await ensureDir(dirname(filePath));
  try {
    await readFile(filePath, 'utf8');
  } catch {
    await writeFile(filePath, '', 'utf8');
  }
}

export async function readLines(filePath: string): Promise<string[]> {
  const content = await readFile(filePath, 'utf8');
  return content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);
}

export async function writeLines(filePath: string, lines: string[]): Promise<void> {
  await writeFile(filePath, lines.length > 0 ? `${lines.join('\n')}\n` : '', 'utf8');
}

export async function appendLines(filePath: string, lines: string[]): Promise<void> {
  if (lines.length === 0) return;
  await appendFile(filePath, `${lines.join('\n')}\n`, 'utf8');
}

export async function appendSkipped(filePath: string, records: SkippedRecord[]): Promise<void> {
  await appendLines(
    filePath,
    records.map((record) => `${record.url}\t${record.reason}`),
  );
}

export async function appendErrors(filePath: string, records: ErrorRecord[]): Promise<void> {
  await appendLines(
    filePath,
    records.map((record) => `${record.url}\t${record.stage}\t${record.message}`),
  );
}

export async function writeAuditCsv(filePath: string, rows: AuditRecord[]): Promise<void> {
  const csv = stringify(rows, {
    header: true,
    columns: AUDIT_COLUMNS,
  });
  await writeFile(filePath, csv, 'utf8');
}

export async function writeRobotsCsv(filePath: string, rows: RobotsDirective[]): Promise<void> {
  const csv = stringify(rows, {
    header: true,
    columns: ROBOTS_COLUMNS,
  });
  await writeFile(filePath, csv, 'utf8');
}

export async function writeDiffCsv(filePath: string, rows: DiffRecord[]): Promise<void> {
  const csv = stringify(rows, {
    header: true,
    columns: DIFF_COLUMNS,
  });
  await writeFile(filePath, csv, 'utf8');
}

