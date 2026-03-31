import { mkdtemp, mkdir, writeFile, rm, stat } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import {
  createProject,
  listProjects,
  deleteProject,
  loadProject,
  listRuns,
} from '../src/project.js';

describe('project operations', () => {
  let tmpDir: string;

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'seo-project-test-'));
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
  });

  describe('createProject', () => {
    it('creates config.json with correct fields', async () => {
      const project = await createProject('mysite', 'https://example.com', tmpDir);
      expect(project.name).toBe('mysite');
      expect(project.url).toBe('https://example.com');
      expect(project.createdAt).toMatch(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}/);

      const { readFile } = await import('node:fs/promises');
      const raw = await readFile(path.join(tmpDir, 'mysite', 'config.json'), 'utf8');
      const parsed = JSON.parse(raw);
      expect(parsed.name).toBe('mysite');
      expect(parsed.url).toBe('https://example.com');
      expect(parsed.createdAt).toBe(project.createdAt);
    });

    it('throws "already exists" when project name is duplicate', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await expect(createProject('mysite', 'https://other.com', tmpDir)).rejects.toThrow(
        'already exists',
      );
    });

    it('throws "invalid" for empty name', async () => {
      await expect(createProject('', 'https://example.com', tmpDir)).rejects.toThrow('invalid');
    });

    it('throws "invalid" for name containing "/"', async () => {
      await expect(createProject('foo/bar', 'https://example.com', tmpDir)).rejects.toThrow(
        'invalid',
      );
    });

    it('throws "invalid" for name containing ".."', async () => {
      await expect(createProject('..', 'https://example.com', tmpDir)).rejects.toThrow('invalid');
    });
  });

  describe('listProjects', () => {
    it('returns all projects sorted by name', async () => {
      await createProject('zebra', 'https://zebra.com', tmpDir);
      await createProject('alpha', 'https://alpha.com', tmpDir);
      await createProject('middle', 'https://middle.com', tmpDir);

      const projects = await listProjects(tmpDir);
      expect(projects).toHaveLength(3);
      expect(projects[0].name).toBe('alpha');
      expect(projects[1].name).toBe('middle');
      expect(projects[2].name).toBe('zebra');
    });

    it('returns empty array when no projects exist', async () => {
      const projects = await listProjects(tmpDir);
      expect(projects).toEqual([]);
    });

    it('returns empty array when directory does not exist', async () => {
      const projects = await listProjects(path.join(tmpDir, 'nonexistent'));
      expect(projects).toEqual([]);
    });
  });

  describe('deleteProject', () => {
    it('removes the project directory', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await deleteProject('mysite', tmpDir);

      await expect(stat(path.join(tmpDir, 'mysite'))).rejects.toThrow();
    });

    it('throws "not found" when project does not exist', async () => {
      await expect(deleteProject('ghost', tmpDir)).rejects.toThrow('not found');
    });
  });

  describe('loadProject', () => {
    it('returns the project from config.json', async () => {
      const created = await createProject('mysite', 'https://example.com', tmpDir);
      const loaded = await loadProject('mysite', tmpDir);

      expect(loaded.name).toBe(created.name);
      expect(loaded.url).toBe(created.url);
      expect(loaded.createdAt).toBe(created.createdAt);
    });

    it('throws "not found" when project does not exist', async () => {
      await expect(loadProject('ghost', tmpDir)).rejects.toThrow('not found');
    });
  });

  describe('listRuns', () => {
    async function createRun(
      projectsDir: string,
      projectName: string,
      date: string,
      contents: Array<{ name: string; isDir?: boolean; fileContent?: string }>,
    ): Promise<void> {
      const runDir = path.join(projectsDir, projectName, date);
      await mkdir(runDir, { recursive: true });
      for (const item of contents) {
        if (item.isDir) {
          await mkdir(path.join(runDir, item.name), { recursive: true });
        } else {
          await writeFile(path.join(runDir, item.name), item.fileContent ?? '', 'utf8');
        }
      }
    }

    it('returns empty array for project with no dated folders', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      const runs = await listRuns('mysite', tmpDir);
      expect(runs).toEqual([]);
    });

    it('throws "not found" for nonexistent project', async () => {
      await expect(listRuns('ghost', tmpDir)).rejects.toThrow('not found');
    });

    it('returns runs sorted newest-first', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await createRun(tmpDir, 'mysite', '2026-03-30', [{ name: 'done.txt' }]);
      await createRun(tmpDir, 'mysite', '2026-03-31', [{ name: 'done.txt' }]);

      const runs = await listRuns('mysite', tmpDir);
      expect(runs).toHaveLength(2);
      expect(runs[0].date).toBe('2026-03-31');
      expect(runs[1].date).toBe('2026-03-30');
    });

    it('identifies type "pages" when done.txt exists', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await createRun(tmpDir, 'mysite', '2026-03-30', [{ name: 'done.txt' }]);

      const runs = await listRuns('mysite', tmpDir);
      expect(runs[0].type).toBe('pages');
    });

    it('identifies type "pages" when audit.csv exists', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await createRun(tmpDir, 'mysite', '2026-03-30', [{ name: 'audit.csv' }]);

      const runs = await listRuns('mysite', tmpDir);
      expect(runs[0].type).toBe('pages');
    });

    it('identifies type "sitemap" when sitemaps/ dir exists', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await createRun(tmpDir, 'mysite', '2026-03-30', [{ name: 'sitemaps', isDir: true }]);

      const runs = await listRuns('mysite', tmpDir);
      expect(runs[0].type).toBe('sitemap');
    });

    it('identifies type "pages+sitemap" when both done.txt and sitemaps/ exist', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await createRun(tmpDir, 'mysite', '2026-03-30', [
        { name: 'done.txt' },
        { name: 'sitemaps', isDir: true },
      ]);

      const runs = await listRuns('mysite', tmpDir);
      expect(runs[0].type).toBe('pages+sitemap');
    });

    it('identifies type "empty" when folder has no recognized content', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await createRun(tmpDir, 'mysite', '2026-03-30', []);

      const runs = await listRuns('mysite', tmpDir);
      expect(runs[0].type).toBe('empty');
    });

    it('counts files in the dated folder', async () => {
      await createProject('mysite', 'https://example.com', tmpDir);
      await createRun(tmpDir, 'mysite', '2026-03-30', [
        { name: 'done.txt' },
        { name: 'audit.csv' },
        { name: 'sitemaps', isDir: true },
      ]);

      const runs = await listRuns('mysite', tmpDir);
      expect(runs[0].fileCount).toBe(3);
    });
  });
});
