import path from 'node:path';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Command } from 'commander';

// Mock all external dependencies before importing the module under test
vi.mock('../src/commands/crawl.js', () => ({
  crawlCommand: vi.fn().mockResolvedValue(undefined),
}));
vi.mock('../src/commands/audit.js', () => ({
  auditCommand: vi.fn().mockResolvedValue(undefined),
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
vi.mock('node:fs/promises', async (importOriginal) => {
  const actual = await importOriginal<typeof import('node:fs/promises')>();
  return {
    ...actual,
    access: vi.fn().mockResolvedValue(undefined),
  };
});

import { crawlCommand } from '../src/commands/crawl.js';
import { auditCommand } from '../src/commands/audit.js';
import { loadProject } from '../src/project.js';
import { todayDateStr, resolveDate } from '../src/date-resolver.js';
import { ensureDir } from '../src/io/files.js';
import { access } from 'node:fs/promises';
import { projectCommand } from '../src/commands/project.js';

const crawlCommandMock = vi.mocked(crawlCommand);
const auditCommandMock = vi.mocked(auditCommand);
const loadProjectMock = vi.mocked(loadProject);
const todayDateStrMock = vi.mocked(todayDateStr);
const resolveDateMock = vi.mocked(resolveDate);
const ensureDirMock = vi.mocked(ensureDir);
const accessMock = vi.mocked(access);

function makeProgram(): Command {
  const program = new Command();
  program.exitOverride(); // prevent process.exit in tests
  program.addCommand(projectCommand());
  return program;
}

describe('project pages crawl', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    todayDateStrMock.mockReturnValue('2026-03-31');
    loadProjectMock.mockResolvedValue({
      name: 'mysite',
      url: 'https://example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
  });

  it('calls crawlCommand with stateDir = projects/<name>/YYYY-MM-DD/', async () => {
    const program = makeProgram();
    await program.parseAsync(
      ['node', 'seo', 'project', 'pages', 'crawl', 'mysite', '--projects-dir', '/tmp/projects'],
    );

    expect(loadProjectMock).toHaveBeenCalledWith('mysite', '/tmp/projects');
    expect(ensureDirMock).toHaveBeenCalledWith('/tmp/projects/mysite/2026-03-31');
    expect(crawlCommandMock).toHaveBeenCalledWith(
      'https://example.com',
      expect.objectContaining({
        stateDir: '/tmp/projects/mysite/2026-03-31',
      }),
    );
  });

  it('prints error to stderr when project does not exist', async () => {
    loadProjectMock.mockRejectedValue(new Error('Project "ghost" not found'));
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync(
      ['node', 'seo', 'project', 'pages', 'crawl', 'ghost', '--projects-dir', '/tmp/projects'],
    );

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('Project "ghost" not found'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    stderrSpy.mockRestore();
  });
});

describe('project pages audit', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    loadProjectMock.mockResolvedValue({
      name: 'mysite',
      url: 'https://example.com',
      createdAt: '2026-01-01T00:00:00.000Z',
    });
    // By default, access succeeds (done.txt exists)
    accessMock.mockResolvedValue(undefined);
  });

  it('calls auditCommand with done.txt and audit.csv from latest dated folder', async () => {
    resolveDateMock.mockResolvedValue('/tmp/projects/mysite/2026-03-30');

    const program = makeProgram();
    await program.parseAsync(
      ['node', 'seo', 'project', 'pages', 'audit', 'mysite', '--projects-dir', '/tmp/projects'],
    );

    expect(resolveDateMock).toHaveBeenCalledWith('mysite', undefined, '/tmp/projects');
    expect(auditCommandMock).toHaveBeenCalledWith(
      '/tmp/projects/mysite/2026-03-30/done.txt',
      expect.objectContaining({
        output: '/tmp/projects/mysite/2026-03-30/audit.csv',
      }),
    );
  });

  it('calls auditCommand using specified --date folder', async () => {
    resolveDateMock.mockResolvedValue('/tmp/projects/mysite/2026-03-30');

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'pages', 'audit', 'mysite',
      '--projects-dir', '/tmp/projects',
      '--date', '2026-03-30',
    ]);

    expect(resolveDateMock).toHaveBeenCalledWith('mysite', '2026-03-30', '/tmp/projects');
    expect(auditCommandMock).toHaveBeenCalledWith(
      '/tmp/projects/mysite/2026-03-30/done.txt',
      expect.objectContaining({
        output: '/tmp/projects/mysite/2026-03-30/audit.csv',
      }),
    );
  });

  it('resolves "yesterday" keyword via resolveDate', async () => {
    resolveDateMock.mockResolvedValue('/tmp/projects/mysite/2026-03-30');

    const program = makeProgram();
    await program.parseAsync([
      'node', 'seo', 'project', 'pages', 'audit', 'mysite',
      '--projects-dir', '/tmp/projects',
      '--date', 'yesterday',
    ]);

    expect(resolveDateMock).toHaveBeenCalledWith('mysite', 'yesterday', '/tmp/projects');
  });

  it('prints error to stderr when no runs found (resolveDate throws)', async () => {
    resolveDateMock.mockRejectedValue(new Error('No runs found for project "newsite"'));
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync(
      ['node', 'seo', 'project', 'pages', 'audit', 'newsite', '--projects-dir', '/tmp/projects'],
    );

    expect(stderrSpy).toHaveBeenCalledWith(expect.stringContaining('No runs found'));
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    stderrSpy.mockRestore();
  });

  it('prints clear error when done.txt does not exist', async () => {
    resolveDateMock.mockResolvedValue('/tmp/projects/mysite/2026-03-31');
    accessMock.mockRejectedValue(Object.assign(new Error('ENOENT'), { code: 'ENOENT' }));
    const stderrSpy = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);

    const program = makeProgram();
    await program.parseAsync(
      ['node', 'seo', 'project', 'pages', 'audit', 'mysite', '--projects-dir', '/tmp/projects'],
    );

    expect(stderrSpy).toHaveBeenCalledWith(
      expect.stringContaining('No done.txt found'),
    );
    expect(process.exitCode).toBe(1);
    process.exitCode = 0;
    stderrSpy.mockRestore();
  });
});
