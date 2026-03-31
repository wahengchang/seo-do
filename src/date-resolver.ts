import { readdir } from 'node:fs/promises';
import path from 'node:path';

const DATE_FOLDER_RE = /^\d{4}-\d{2}-\d{2}$/;

/**
 * Returns today's date as a YYYY-MM-DD string.
 * Used by crawl/audit commands when creating dated output folders.
 */
export function todayDateStr(): string {
  return new Date().toISOString().slice(0, 10);
}

/**
 * Computes an offset date string relative to today.
 * offset = -1 gives yesterday, offset = -7 gives last-week.
 */
function offsetDateStr(daysOffset: number): string {
  const d = new Date();
  d.setDate(d.getDate() + daysOffset);
  return d.toISOString().slice(0, 10);
}

/**
 * Reads YYYY-MM-DD dated folder names from a project directory.
 */
async function getDatedFolders(projectDir: string): Promise<string[]> {
  let entries;
  try {
    entries = await readdir(projectDir, { withFileTypes: true });
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  return entries
    .filter((e) => e.isDirectory() && DATE_FOLDER_RE.test(e.name))
    .map((e) => e.name)
    .sort();
}

/**
 * Resolves a `--date` flag value to a concrete dated folder path.
 *
 * @param projectName  Project name (folder under projectsDir)
 * @param dateArg      Date value: exact YYYY-MM-DD, 'yesterday', 'last-week', or undefined
 * @param projectsDir  Root projects directory
 * @returns            Absolute path to the resolved dated folder
 * @throws             Error if the folder does not exist or no runs are found
 */
export async function resolveDate(
  projectName: string,
  dateArg: string | undefined,
  projectsDir: string,
): Promise<string> {
  const projectDir = path.join(projectsDir, projectName);
  const available = await getDatedFolders(projectDir);

  if (dateArg === undefined) {
    if (available.length === 0) {
      throw new Error(`No runs found for project "${projectName}"`);
    }
    // Sort descending — last element after ascending sort is the latest date
    const latest = [...available].sort().at(-1) as string;
    return path.join(projectsDir, projectName, latest);
  }

  let dateStr: string;

  if (dateArg === 'yesterday') {
    dateStr = offsetDateStr(-1);
  } else if (dateArg === 'last-week') {
    dateStr = offsetDateStr(-7);
  } else {
    dateStr = dateArg;
  }

  if (available.includes(dateStr)) {
    return path.join(projectsDir, projectName, dateStr);
  }

  const listedAvailable = available.join(', ');
  throw new Error(
    `No run found for ${dateStr}. Available: ${listedAvailable}`,
  );
}
