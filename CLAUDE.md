# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

```bash
npm install          # Install dependencies
npm run build        # Compile TypeScript to dist/
npm run dev -- <args> # Run CLI without building (via tsx)
npm test             # Run all tests
```

Run a single test file:
```bash
npx vitest run tests/url.test.ts
```

Run CLI after building:
```bash
node dist/cli.js crawl https://example.com
node dist/cli.js audit ./state/done.txt
```

Run CLI in dev mode:
```bash
npm run dev -- crawl https://example.com
npm run dev -- audit ./state/done.txt --output ./state/audit.csv
```

## Architecture

This is a two-stage, file-driven SEO CLI tool. The stages are intentionally decoupled to allow manual URL editing between them:

```
seo crawl <url>  →  state/done.txt  →  [manual edit]  →  seo audit <file>  →  state/audit.csv
```

### Source Layout

```
src/
  cli.ts              # Entry point, registers commander commands
  crawler.ts          # runCrawl() — main crawl loop
  audit.ts            # runAudit() — main audit loop
  types.ts            # All shared types: AuditRecord, CrawlOptions, FetchPageResult, etc.
  state.ts            # getStatePaths() — derives file paths from stateDir
  constants.ts        # Shared constants (non-HTML extensions, UTM params, etc.)
  commands/
    crawl.ts          # CLI handler → calls runCrawl()
    audit.ts          # CLI handler → calls runAudit()
  shared/
    url.ts            # normalizeUrl(), getSkipReason() — URL normalization & filtering
    html.ts           # collectAnchorHrefs(), heading/tracking/structured-data extractors
    http.ts           # fetchPage() — undici-based HTTP fetch, returns FetchPageResult
  io/
    files.ts          # appendLines(), appendSkipped(), appendErrors(), writeAuditCsv(), ensureStateFiles()
  extractors/
    audit-record.ts   # buildAuditRecord() — maps FetchPageResult → AuditRecord
```

### Key Data Flow

**Crawl:** `runCrawl()` seeds a queue, fetches pages via `fetchPage()`, extracts links via `collectAnchorHrefs()`, normalizes/filters each link via `normalizeUrl()` + `getSkipReason()`, and writes results to `done.txt` / `skipped.txt` / `error.txt`. Single-threaded serial loop.

**Audit:** `runAudit()` reads URLs from a file, fetches each via `fetchPage()`, maps the result to `AuditRecord` via `buildAuditRecord()`, and writes all rows to `audit.csv` via `writeAuditCsv()`. Failures go to `error.txt`; the loop continues regardless.

### AuditRecord CSV Contract

Column order is fixed (matches `sample.csv`):
```
url, title, description, canonical, isRedirect, h1Count, h1Text, h2Count, h2Text,
h3Count, h3Text, size, ga4Count, ga4Ids, gtmCount, gtmIds, isBreadcrumb,
isBlogPosting, isArticle, isFaq, isLogo, isSsr, countStructureData
```

Output conventions: booleans as `TRUE`/`FALSE`, missing strings as `""`, multi-value fields (IDs, heading texts) as comma-joined strings.

### State Files

All state files live under `--state-dir` (default `./state`):
- `queue.txt` — one URL per line, pending crawl
- `done.txt` — one URL per line, successfully crawled (user may edit before audit)
- `skipped.txt` — `url<TAB>reason`
- `error.txt` — `url<TAB>stage<TAB>message`
- `audit.csv` — final audit output

### Design Constraints

- No JS rendering (no Puppeteer/Playwright) — static HTML only
- No database — all state is plain text files
- `isSsr` is heuristic: `TRUE` if key SEO signals (title, headings, structured data) are present in raw HTML
- `sample.csv` is the authoritative output contract, not just `Requirements.md`
