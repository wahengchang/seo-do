import { mkdtemp, rm, mkdir } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import path from 'node:path';
import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

// We will mock todayDateStr to control "today" in relative date tests
vi.mock('../src/date-resolver.js', async (importOriginal) => {
  const original = await importOriginal<typeof import('../src/date-resolver.js')>();
  return {
    ...original,
    todayDateStr: vi.fn(() => original.todayDateStr()),
  };
});

import { resolveDate, todayDateStr } from '../src/date-resolver.js';

describe('todayDateStr', () => {
  it('returns a string matching YYYY-MM-DD format', () => {
    const result = todayDateStr();
    expect(result).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it('returns the current date in UTC-aligned ISO format', () => {
    const result = todayDateStr();
    const expected = new Date().toISOString().slice(0, 10);
    expect(result).toBe(expected);
  });
});

describe('resolveDate', () => {
  let tmpDir: string;
  let projectDir: string;
  const PROJECT_NAME = 'mysite';

  // Helper to create a dated folder
  async function createDateFolder(dateStr: string): Promise<void> {
    await mkdir(path.join(projectDir, dateStr), { recursive: true });
  }

  beforeEach(async () => {
    tmpDir = await mkdtemp(path.join(tmpdir(), 'seo-date-resolver-test-'));
    projectDir = path.join(tmpDir, PROJECT_NAME);
    await mkdir(projectDir, { recursive: true });
  });

  afterEach(async () => {
    await rm(tmpDir, { recursive: true, force: true });
    vi.restoreAllMocks();
  });

  describe('exact date string', () => {
    it('returns the absolute path when the folder exists', async () => {
      await createDateFolder('2026-03-30');
      const result = await resolveDate(PROJECT_NAME, '2026-03-30', tmpDir);
      expect(result).toBe(path.join(tmpDir, PROJECT_NAME, '2026-03-30'));
    });

    it('throws with available dates when folder does not exist', async () => {
      await createDateFolder('2026-03-28');
      await createDateFolder('2026-03-31');
      await expect(resolveDate(PROJECT_NAME, '2026-03-30', tmpDir)).rejects.toThrow(
        'No run found for 2026-03-30',
      );
    });

    it('lists available dates in the error message', async () => {
      await createDateFolder('2026-03-28');
      await createDateFolder('2026-03-31');
      await expect(resolveDate(PROJECT_NAME, '2026-03-30', tmpDir)).rejects.toThrow(
        /Available: 2026-03-28, 2026-03-31/,
      );
    });

    it('ignores non-date entries like config.json when listing available dates', async () => {
      await createDateFolder('2026-03-28');
      // config.json will not be a folder but let's add a non-date dir
      await mkdir(path.join(projectDir, 'exports'), { recursive: true });
      await expect(resolveDate(PROJECT_NAME, '2026-03-30', tmpDir)).rejects.toThrow(
        /Available: 2026-03-28/,
      );
      const errorMsg = await resolveDate(PROJECT_NAME, '2026-03-28', tmpDir).then(
        () => null,
        (e: Error) => e.message,
      );
      // No error — the folder exists
      expect(errorMsg).toBeNull();
    });
  });

  describe('relative date: yesterday', () => {
    it('resolves to yesterday date folder when it exists', async () => {
      const mockedToday = vi.mocked(todayDateStr);
      mockedToday.mockReturnValue('2026-03-31');
      const yesterday = '2026-03-30';
      await createDateFolder(yesterday);

      const result = await resolveDate(PROJECT_NAME, 'yesterday', tmpDir);
      expect(result).toBe(path.join(tmpDir, PROJECT_NAME, yesterday));
    });

    it('throws when yesterday folder does not exist', async () => {
      const mockedToday = vi.mocked(todayDateStr);
      mockedToday.mockReturnValue('2026-03-31');
      await expect(resolveDate(PROJECT_NAME, 'yesterday', tmpDir)).rejects.toThrow(
        'No run found for 2026-03-30',
      );
    });
  });

  describe('relative date: last-week', () => {
    it('resolves to 7-days-ago folder when it exists', async () => {
      const mockedToday = vi.mocked(todayDateStr);
      mockedToday.mockReturnValue('2026-03-31');
      const lastWeek = '2026-03-24';
      await createDateFolder(lastWeek);

      const result = await resolveDate(PROJECT_NAME, 'last-week', tmpDir);
      expect(result).toBe(path.join(tmpDir, PROJECT_NAME, lastWeek));
    });

    it('throws when last-week folder does not exist', async () => {
      const mockedToday = vi.mocked(todayDateStr);
      mockedToday.mockReturnValue('2026-03-31');
      await expect(resolveDate(PROJECT_NAME, 'last-week', tmpDir)).rejects.toThrow(
        'No run found for 2026-03-24',
      );
    });
  });

  describe('undefined dateArg (default to latest)', () => {
    it('returns the latest dated folder when multiple exist', async () => {
      await createDateFolder('2026-03-28');
      await createDateFolder('2026-03-31');
      await createDateFolder('2026-03-25');

      const result = await resolveDate(PROJECT_NAME, undefined, tmpDir);
      expect(result).toBe(path.join(tmpDir, PROJECT_NAME, '2026-03-31'));
    });

    it('ignores non-date entries and returns latest date', async () => {
      await createDateFolder('2026-03-28');
      await mkdir(path.join(projectDir, 'exports'), { recursive: true });
      // config.json is a file not a dir, but we only filter by name pattern

      const result = await resolveDate(PROJECT_NAME, undefined, tmpDir);
      expect(result).toBe(path.join(tmpDir, PROJECT_NAME, '2026-03-28'));
    });

    it('throws when no dated folders exist', async () => {
      await expect(resolveDate(PROJECT_NAME, undefined, tmpDir)).rejects.toThrow(
        `No runs found for project "${PROJECT_NAME}"`,
      );
    });

    it('throws when only non-date folders exist', async () => {
      await mkdir(path.join(projectDir, 'exports'), { recursive: true });
      await expect(resolveDate(PROJECT_NAME, undefined, tmpDir)).rejects.toThrow(
        `No runs found for project "${PROJECT_NAME}"`,
      );
    });
  });
});
