import path from 'node:path';
import type { StatePaths } from './types.js';

export function getStatePaths(stateDir: string): StatePaths {
  return {
    stateDir,
    queueFile: path.join(stateDir, 'queue.txt'),
    doneFile: path.join(stateDir, 'done.txt'),
    skippedFile: path.join(stateDir, 'skipped.txt'),
    errorFile: path.join(stateDir, 'error.txt'),
    auditFile: path.join(stateDir, 'audit.csv'),
  };
}
