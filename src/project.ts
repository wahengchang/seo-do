import { readdir, readFile, writeFile, rm } from 'node:fs/promises';
import path from 'node:path';
import { ensureDir } from './io/files.js';
import type { Project } from './types.js';

const NAME_RE = /^[a-zA-Z0-9_-]+$/;
const DATE_FOLDER_RE = /^\d{4}-\d{2}-\d{2}$/;

export interface RunInfo {
  date: string;       // YYYY-MM-DD
  type: string;       // "pages", "sitemap", "pages+sitemap", "empty"
  fileCount: number;  // number of entries in the dated folder
}

export async function createProject(
  name: string,
  url: string,
  projectsDir: string,
): Promise<Project> {
  if (!name || !NAME_RE.test(name)) {
    throw new Error(`Project name is invalid: "${name}"`);
  }

  const configPath = path.join(projectsDir, name, 'config.json');

  // Check for duplicate
  try {
    await readFile(configPath, 'utf8');
    throw new Error(`Project "${name}" already exists`);
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code !== 'ENOENT') {
      throw err;
    }
    // ENOENT means it does not exist — proceed
  }

  await ensureDir(path.join(projectsDir, name));

  const project: Project = {
    name,
    url,
    createdAt: new Date().toISOString(),
  };

  await writeFile(configPath, JSON.stringify(project, null, 2), 'utf8');

  return project;
}

export async function loadProject(name: string, projectsDir: string): Promise<Project> {
  const configPath = path.join(projectsDir, name, 'config.json');

  try {
    const raw = await readFile(configPath, 'utf8');
    return JSON.parse(raw) as Project;
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      throw new Error(`Project "${name}" not found`);
    }
    throw err;
  }
}

export async function listProjects(projectsDir: string): Promise<Project[]> {
  let entries;
  try {
    entries = await readdir(projectsDir, { withFileTypes: true });
  } catch (err: unknown) {
    const nodeErr = err as NodeJS.ErrnoException;
    if (nodeErr.code === 'ENOENT') {
      return [];
    }
    throw err;
  }

  const dirs = entries.filter((e) => e.isDirectory());

  const projects: Project[] = [];
  for (const dir of dirs) {
    try {
      const configPath = path.join(projectsDir, dir.name, 'config.json');
      const raw = await readFile(configPath, 'utf8');
      projects.push(JSON.parse(raw) as Project);
    } catch {
      // skip directories without a valid config.json
    }
  }

  return projects.sort((a, b) => a.name.localeCompare(b.name));
}

export async function deleteProject(name: string, projectsDir: string): Promise<void> {
  // Throws "not found" if project does not exist
  await loadProject(name, projectsDir);

  await rm(path.join(projectsDir, name), { recursive: true, force: true });
}

export async function listRuns(name: string, projectsDir: string): Promise<RunInfo[]> {
  // Validate project exists (throws "not found" if missing)
  await loadProject(name, projectsDir);

  const projectDir = path.join(projectsDir, name);
  const entries = await readdir(projectDir, { withFileTypes: true });

  const dateDirs = entries.filter((e) => e.isDirectory() && DATE_FOLDER_RE.test(e.name));

  const runs: RunInfo[] = [];
  for (const dir of dateDirs) {
    const dirPath = path.join(projectDir, dir.name);
    const contents = await readdir(dirPath, { withFileTypes: true });

    const names = new Set(contents.map((e) => e.name));
    const hasPagesArtifact = names.has('done.txt') || names.has('audit.csv');
    const hasSitemaps = contents.some((e) => e.isDirectory() && e.name === 'sitemaps');
    const hasRobots = names.has('robots.txt') || names.has('robots-audit.csv');

    const detectedTypes: string[] = [];
    if (hasPagesArtifact) detectedTypes.push('pages');
    if (hasSitemaps) detectedTypes.push('sitemap');
    if (hasRobots) detectedTypes.push('robots');
    const type = detectedTypes.length > 0 ? detectedTypes.join('+') : 'empty';

    runs.push({
      date: dir.name,
      type,
      fileCount: contents.length,
    });
  }

  // Sort descending by date (newest first)
  runs.sort((a, b) => b.date.localeCompare(a.date));

  return runs;
}
