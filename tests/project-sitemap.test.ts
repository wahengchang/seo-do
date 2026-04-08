import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock all external dependencies before importing the module under test
vi.mock('../src/sitemap-download.js', () => ({
  runSitemapDownload: vi.fn().mockResolvedValue([]),
  computeStats: vi.fn().mockReturnValue({ totalUrls: 0, subSitemapCount: 0, urlsPerSitemap: [] }),
  grepSitemapDir: vi.fn().mockResolvedValue({ matchCount: 0, matches: [] }),
  setIgnoreSsl: vi.fn(),
}));
vi.mock('../src/audit.js', () => ({
  runAudit: vi.fn().mockResolvedValue({ rowCount: 0, errorCount: 0 }),
}));
vi.mock('../src/project.js', () => ({
  loadProject: vi.fn(),
  createProject: vi.fn(),
  listProjects: vi.fn(),
  deleteProject: vi.fn(),
}));
vi.mock('../src/date-resolver.js', () => ({
  todayDateStr: vi.fn().mockReturnValue('2026-03-31'),
  resolveDate: vi.fn(),
}));
vi.mock('../src/io/files.js', () => ({
  ensureDir: vi.fn().mockResolvedValue(undefined),
  ensureStateFiles: vi.fn().mockResolvedValue(undefined),
  appendLines: vi.fn().mockResolvedValue(undefined),
  appendSkipped: vi.fn().mockResolvedValue(undefined),
  appendErrors: vi.fn().mockResolvedValue(undefined),
  writeAuditCsv: vi.fn().mockResolvedValue(undefined),
  readLines: vi.fn().mockResolvedValue([]),
  writeLines: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/shared/http.js', () => ({
  closeBrowser: vi.fn().mockResolvedValue(undefined),
  fetchPage: vi.fn(),
}));
vi.mock('../src/shared/sitemap.js', () => ({
  parseSitemapXml: vi.fn().mockReturnValue([]),
  isSitemapIndex: vi.fn().mockReturnValue(false),
}));
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    readdir: vi.fn().mockResolvedValue([]),
    readFile: vi.fn().mockResolvedValue(''),
    writeFile: vi.fn().mockResolvedValue(undefined),
  };
});

import { runSitemapDownload, computeStats, grepSitemapDir } from '../src/sitemap-download.js';
import { runAudit } from '../src/audit.js';
import { loadProject } from '../src/project.js';
import { todayDateStr, resolveDate } from '../src/date-resolver.js';
import { ensureDir } from '../src/io/files.js';
import { closeBrowser } from '../src/shared/http.js';
import { parseSitemapXml, isSitemapIndex } from '../src/shared/sitemap.js';
import { readdir, readFile, writeFile } from 'node:fs/promises';
import { projectCommand } from '../src/commands/project.js';

const runSitemapDownloadMock = vi.mocked(runSitemapDownload);
const computeStatsMock = vi.mocked(computeStats);
const grepSitemapDirMock = vi.mocked(grepSitemapDir);
const runAuditMock = vi.mocked(runAudit);
const loadProjectMock = vi.mocked(loadProject);
const todayDateStrMock = vi.mocked(todayDateStr);
const resolveDateMock = vi.mocked(resolveDate);
const ensureDirMock = vi.mocked(ensureDir);
const closeBrowserMock = vi.mocked(closeBrowser);
const parseSitemapXmlMock = vi.mocked(parseSitemapXml);
const isSitemapIndexMock = vi.mocked(isSitemapIndex);
const readdirMock = vi.mocked(readdir);
const readFileMock = vi.mocked(readFile);
const writeFileMock = vi.mocked(writeFile);

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride(); // prevent process.exit in tests
  program.addCommand(projectCommand());
  return program;
}

describe('project sitemap download', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    todayDateStrMock.mockReturnValue('2026-03-31');
    loadProjectMock.mockResolvedValue({
      name: 'mysite',
      url: 'https://example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    runSitemapDownloadMock.mockResolvedValue([]);
    computeStatsMock.mockReturnValue({ totalUrls: 0, subSitemapCount: 0, urlsPerSitemap: [] });
  });

  it('calls loadProject and runSitemapDownload with correct sitemapUrl and outputDir', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'download', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(loadProjectMock).toHaveBeenCalledWith('mysite', '/tmp/projects');
    expect(runSitemapDownloadMock).toHaveBeenCalledWith(
      'https://example.com/sitemap.xml',
      '/tmp/projects/mysite/2026-03-31/sitemaps/',
      99, // default max-depth
    );
  });

  it('strips trailing slash from project URL when deriving sitemapUrl', async () => {
    loadProjectMock.mockResolvedValue({
      name: 'mysite',
      url: 'https://example.com/',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'download', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(runSitemapDownloadMock).toHaveBeenCalledWith(
      'https://example.com/sitemap.xml',
      expect.any(String),
      expect.any(Number),
    );
  });

  it('creates the sitemaps directory', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'download', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(ensureDirMock).toHaveBeenCalledWith('/tmp/projects/mysite/2026-03-31/sitemaps/');
  });

  it('calls closeBrowser in finally block even on success', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'download', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(closeBrowserMock).toHaveBeenCalled();
  });

  it('prints error to stderr when project does not exist', async () => {
    loadProjectMock.mockRejectedValue(new Error('Project "ghost" not found'));
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'download', 'ghost',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Project "ghost" not found'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    stderrSpy.mockRestore();
  });

  it('calls closeBrowser in finally block on error', async () => {
    loadProjectMock.mockRejectedValue(new Error('Project not found'));

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'download', 'ghost',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(closeBrowserMock).toHaveBeenCalled();
    process.exitCode = 0;
  });
});

describe('project sitemap stats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadProjectMock.mockResolvedValue({
      name: 'mysite',
      url: 'https://example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    resolveDateMock.mockResolvedValue('/tmp/projects/mysite/2026-03-31');
    readdirMock.mockResolvedValue([] as unknown as string[]);
    computeStatsMock.mockReturnValue({ totalUrls: 5, subSitemapCount: 1, urlsPerSitemap: [] });
  });

  it('calls resolveDate with undefined when no --date given', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'stats', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(resolveDateMock).toHaveBeenCalledWith('mysite', undefined, '/tmp/projects');
  });

  it('calls resolveDate with the provided --date value', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'stats', 'mysite',
      '--projects-dir', '/tmp/projects',
      '--date', '2026-03-30',
    ]);

    expect(resolveDateMock).toHaveBeenCalledWith('mysite', '2026-03-30', '/tmp/projects');
  });

  it('calls resolveDate with "yesterday" keyword', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'stats', 'mysite',
      '--projects-dir', '/tmp/projects',
      '--date', 'yesterday',
    ]);

    expect(resolveDateMock).toHaveBeenCalledWith('mysite', 'yesterday', '/tmp/projects');
  });

  it('reads from resolvedDir/sitemaps/ subdirectory', async () => {
    readdirMock.mockResolvedValue(['00-sitemap.xml'] as unknown as string[]);
    readFileMock.mockResolvedValue('<urlset></urlset>' as unknown as Buffer);
    parseSitemapXmlMock.mockReturnValue([]);
    isSitemapIndexMock.mockReturnValue(false);

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'stats', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(readdirMock).toHaveBeenCalledWith('/tmp/projects/mysite/2026-03-31/sitemaps/');
  });

  it('prints error to stderr when no runs found', async () => {
    resolveDateMock.mockRejectedValue(new Error('No runs found for project "newsite"'));
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'stats', 'newsite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('No runs found'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    stderrSpy.mockRestore();
  });
});

describe('project sitemap search', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadProjectMock.mockResolvedValue({
      name: 'mysite',
      url: 'https://example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    resolveDateMock.mockResolvedValue('/tmp/projects/mysite/2026-03-31');
    grepSitemapDirMock.mockResolvedValue({ matchCount: 0, matches: [] });
  });

  it('calls resolveDate and grepSitemapDir with correct dir and keyword', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'search', 'mysite', 'blog',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(resolveDateMock).toHaveBeenCalledWith('mysite', undefined, '/tmp/projects');
    expect(grepSitemapDirMock).toHaveBeenCalledWith(
      '/tmp/projects/mysite/2026-03-31/sitemaps/',
      'blog',
    );
  });

  it('passes --date to resolveDate', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'search', 'mysite', 'blog',
      '--projects-dir', '/tmp/projects',
      '--date', '2026-03-30',
    ]);

    expect(resolveDateMock).toHaveBeenCalledWith('mysite', '2026-03-30', '/tmp/projects');
  });

  it('prints matching URLs when matches found', async () => {
    grepSitemapDirMock.mockResolvedValue({
      matchCount: 2,
      matches: [
        { url: 'https://example.com/blog/post-1', file: '01-sitemap.xml' },
        { url: 'https://example.com/blog/post-2', file: '01-sitemap.xml' },
      ],
    });
    const consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => undefined);

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'search', 'mysite', 'blog',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining('2'));
    consoleSpy.mockRestore();
  });

  it('prints error to stderr when no runs found', async () => {
    resolveDateMock.mockRejectedValue(new Error('No runs found for project "newsite"'));
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'search', 'newsite', 'blog',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('No runs found'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    stderrSpy.mockRestore();
  });
});

describe('project sitemap audit', () => {
  const mockFiles = [
    {
      url: 'https://example.com/sitemap.xml',
      filename: '00-sitemap.xml',
      isIndex: false,
      urlCount: 3,
      filePath: '/tmp/projects/mysite/2026-03-31/sitemaps/00-sitemap.xml',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
    todayDateStrMock.mockReturnValue('2026-03-31');
    loadProjectMock.mockResolvedValue({
      name: 'mysite',
      url: 'https://example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    runSitemapDownloadMock.mockResolvedValue(mockFiles);
    computeStatsMock.mockReturnValue({ totalUrls: 3, subSitemapCount: 1, urlsPerSitemap: [] });
    parseSitemapXmlMock.mockReturnValue([
      'https://example.com/page-1',
      'https://example.com/page-2',
      'https://example.com/page-3',
    ]);
    isSitemapIndexMock.mockReturnValue(false);
    readFileMock.mockResolvedValue('<urlset>...</urlset>' as unknown as Buffer);
    writeFileMock.mockResolvedValue(undefined);
    runAuditMock.mockResolvedValue({ rowCount: 3, errorCount: 0 });
  });

  it('calls loadProject and runSitemapDownload with sitemapUrl and sitemapsDir', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'audit', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(loadProjectMock).toHaveBeenCalledWith('mysite', '/tmp/projects');
    expect(runSitemapDownloadMock).toHaveBeenCalledWith(
      'https://example.com/sitemap.xml',
      '/tmp/projects/mysite/2026-03-31/sitemaps/',
      99,
    );
  });

  it('writes URLs to sitemap-done.txt in the dated folder', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'audit', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(writeFileMock).toHaveBeenCalledWith(
      '/tmp/projects/mysite/2026-03-31/sitemap-done.txt',
      expect.stringContaining('https://example.com/page-1'),
      'utf8',
    );
  });

  it('calls runAudit with output = dated dir + sitemap-audit.csv', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'audit', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(runAuditMock).toHaveBeenCalledWith(
      '/tmp/projects/mysite/2026-03-31/sitemap-done.txt',
      expect.objectContaining({
        output: '/tmp/projects/mysite/2026-03-31/sitemap-audit.csv',
      }),
    );
  });

  it('strips trailing slash from project URL when deriving sitemapUrl', async () => {
    loadProjectMock.mockResolvedValue({
      name: 'mysite',
      url: 'https://example.com/',
      createdAt: '2026-01-01T00:00:00.000Z',
    });

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'audit', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(runSitemapDownloadMock).toHaveBeenCalledWith(
      'https://example.com/sitemap.xml',
      expect.any(String),
      expect.any(Number),
    );
  });

  it('calls closeBrowser in finally block on success', async () => {
    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'audit', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(closeBrowserMock).toHaveBeenCalled();
  });

  it('prints error to stderr when no URLs found in sitemaps', async () => {
    computeStatsMock.mockReturnValue({ totalUrls: 0, subSitemapCount: 0, urlsPerSitemap: [] });
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'audit', 'mysite',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('no URLs found'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    stderrSpy.mockRestore();
  });

  it('prints error to stderr when project does not exist', async () => {
    loadProjectMock.mockRejectedValue(new Error('Project "ghost" not found'));
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'audit', 'ghost',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Project "ghost" not found'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    stderrSpy.mockRestore();
  });

  it('calls closeBrowser in finally block on error', async () => {
    loadProjectMock.mockRejectedValue(new Error('Project not found'));

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'sitemap', 'audit', 'ghost',
      '--projects-dir', '/tmp/projects',
    ]);

    expect(closeBrowserMock).toHaveBeenCalled();
    process.exitCode = 0;
  });
});
