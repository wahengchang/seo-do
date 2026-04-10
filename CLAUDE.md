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
node dist/cli.js pages crawl https://example.com
node dist/cli.js pages audit ./state/done.txt
```

Run CLI in dev mode:
```bash
npm run dev -- pages crawl https://example.com
npm run dev -- pages audit ./state/done.txt --output ./state/audit.csv
```

## Architecture

This is a two-stage, file-driven SEO CLI tool. The stages are intentionally decoupled to allow manual URL editing between them:

```
seo pages crawl <url>  →  state/done.txt  →  [manual edit]  →  seo pages audit <file>  →  state/audit.csv
```

Project mode adds dated folders and cross-run diffing:

```
seo project pages crawl <name>  →  projects/<name>/<date>/done.txt + audit.csv
seo project diff <name>         →  projects/<name>/<date>/diff.csv
```

### Source Layout

```
src/
  cli.ts              # Entry point, registers commander commands
  crawler.ts          # runCrawl() — main crawl loop
  audit.ts            # runAudit() — main audit loop
  diff.ts             # diffPages(), diffRobots(), diffSitemaps(), generateProjectDiffs()
  project.ts          # createProject(), loadProject(), listRuns() — project CRUD
  date-resolver.ts    # todayDateStr(), resolveDate() — date folder resolution
  sitemap-download.ts # runSitemapDownload(), computeStats(), grepSitemapDir()
  types.ts            # All shared types: AuditRecord, DiffRecord, RobotsDirective, etc.
  state.ts            # getStatePaths() — derives file paths from stateDir
  constants.ts        # Shared constants (AUDIT_COLUMNS, DIFF_COLUMNS, ROBOTS_COLUMNS, etc.)
  commands/
    pages.ts          # CLI handler for pages crawl/audit
    audit.ts          # CLI handler → calls runAudit()
    crawl.ts          # CLI handler → calls runCrawl()
    project.ts        # CLI handler for project create/list/delete/runs/pages/sitemap/diff
    sitemap.ts        # CLI handler for standalone sitemap commands
    robots.ts         # CLI handler for standalone robots commands
  shared/
    url.ts            # normalizeUrl(), getSkipReason() — URL normalization & filtering
    html.ts           # collectAnchorHrefs(), heading/tracking/structured-data extractors
    http.ts           # fetchPage() — undici-based HTTP fetch, returns FetchPageResult
    sitemap.ts        # parseSitemapXml(), isSitemapIndex() — XML sitemap parsing
    robots.ts         # parseRobotsTxt() — robots.txt parsing
    cache.ts          # getCachedHtml() — HTML cache lookup
  io/
    files.ts          # appendLines(), writeAuditCsv(), writeDiffCsv(), ensureStateFiles()
  extractors/
    audit-record.ts   # buildAuditRecord() — maps FetchPageResult → AuditRecord
```

### Key Data Flow

**Crawl:** `runCrawl()` seeds a queue, fetches pages via `fetchPage()`, extracts links via `collectAnchorHrefs()`, normalizes/filters each link via `normalizeUrl()` + `getSkipReason()`, and writes results to `done.txt` / `skipped.txt` / `error.txt`. Single-threaded serial loop.

**Audit:** `runAudit()` reads URLs from a file, fetches each via `fetchPage()`, maps the result to `AuditRecord` via `buildAuditRecord()`, and writes all rows to `audit.csv` via `writeAuditCsv()`. Failures go to `error.txt`; the loop continues regardless.

**Diff:** `generateProjectDiffs()` enumerates date folders in a project, compares consecutive pairs via `diffPages()` (audit.csv), `diffRobots()` (robots-audit.csv), and `diffSitemaps()` (sitemap XML URLs), then writes `diff.csv` into each newer folder via `writeDiffCsv()`. Idempotent — skips folders that already have a `diff.csv`.

### AuditRecord CSV Contract

Column order is fixed (matches `sample.csv`):
```
url, title, description, canonical, isRedirect, h1Count, h1Text, h2Count, h2Text,
h3Count, h3Text, size, ga4Count, ga4Ids, gtmCount, gtmIds, isBreadcrumb,
isBlogPosting, isArticle, isFaq, isLogo, isSsr, countStructureData
```

Output conventions: booleans as `TRUE`/`FALSE`, missing strings as `""`, multi-value fields (IDs, heading texts) as comma-joined strings.

### DiffRecord CSV Contract

Column order is fixed:
```
resourceType, url, changeType, field, oldValue, newValue
```

`resourceType` is `pages`, `robots`, or `sitemap`. `changeType` is `added`, `removed`, or `changed`.

### State Files

All state files live under `--state-dir` (default `./state`):
- `queue.txt` — one URL per line, pending crawl
- `done.txt` — one URL per line, successfully crawled (user may edit before audit)
- `skipped.txt` — `url<TAB>reason`
- `error.txt` — `url<TAB>stage<TAB>message`
- `audit.csv` — final audit output
- `html/` — cached HTML pages (reused across crawl and audit)

In project mode, state lives under `projects/<name>/<date>/`:
- `diff.csv` — cross-run comparison (generated by `project diff`)
- `robots-audit.csv` — parsed robots.txt directives
- `sitemaps/` — downloaded sitemap XML files
- `sitemap-audit.csv` — sitemap structure audit (metadata, encoding, duplicates per `<url>` entry; no page fetching)

### Design Constraints

- No JS rendering (no Puppeteer/Playwright) — static HTML only
- No database — all state is plain text files
- `isSsr` is heuristic: `TRUE` if key SEO signals (title, headings, structured data) are present in raw HTML
- `sample.csv` is the authoritative output contract, not just `Requirements.md`
