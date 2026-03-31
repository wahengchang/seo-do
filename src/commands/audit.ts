import path from 'node:path';
import { runAudit } from '../audit.js';
import { closeBrowser } from '../shared/http.js';

export async function auditCommand(
  inputFile: string,
  options: { output: string; origin?: string },
): Promise<void> {
  const resolvedInput = path.resolve(inputFile);
  const resolvedOutput = path.resolve(options.output);
  try {
    const result = await runAudit(resolvedInput, {
      output: resolvedOutput,
      origin: options.origin,
      stateDir: path.dirname(resolvedOutput),
    });
    console.log(`Audit completed. rows=${result.rowCount} errors=${result.errorCount} output=${resolvedOutput}`);
  } finally {
    await closeBrowser();
  }
}
