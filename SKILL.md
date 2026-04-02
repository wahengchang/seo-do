# seo-do — AI Agent Instructions

You are using `seo-do`, a CLI tool for crawling and auditing SEO signals on websites. The binary is `seo-do`. Follow these instructions to use it correctly.

## Prerequisites

Ensure `seo-do` is installed globally:

```bash
npm install -g seo-do
```

Verify with:

```bash
seo-do --help
```

## Core Concepts

- **Two-stage workflow**: crawl first (collect URLs), then audit (analyze each URL for SEO signals)
- **File-driven**: all state is plain text files — no database
- **Static HTML only**: no JavaScript rendering — SPA/React sites will show incomplete data
- **Small sites**: designed for sites with < 100 pages

## Commands

### 1. Crawl a Website

Crawl same-origin links starting from a seed URL:

```bash
seo-do pages crawl <url> [--state-dir ./state] [--max-pages 100]
```

Output: `./state/done.txt` (one URL per line)

### 2. Audit a URL List

Run SEO audit on each URL in a file:

```bash
seo-do pages audit <file> [--output ./state/audit.csv] [--origin <url>]
```

Output: `./state/audit.csv`

### 3. Robots.txt Tools

```bash
seo-do robots download <url> [--output ./state/robots.txt] [--ignore-ssl]
seo-do robots audit <url> [--output ./state/robots-audit.csv] [--ignore-ssl]
```

- `robots download`: Fetches robots.txt and saves the raw content
- `robots audit`: Fetches robots.txt, parses all directives (User-agent, Disallow, Allow, Sitemap, Crawl-delay), and outputs a structured CSV

The `<url>` can be a domain (`https://example.com`) or a full robots.txt URL (`https://example.com/robots.txt`).

### 4. Sitemap Tools

```bash
seo-do sitemap download <sitemap-url> [--output-dir ./state/sitemaps] [--max-depth 3] [--ignore-ssl]
seo-do sitemap stats [--dir ./state/sitemaps]
seo-do sitemap search <keyword> [--dir ./state/sitemaps]
seo-do sitemap audit <sitemap-url> [--output ./state/sitemap-audit.csv] [--max-depth 3] [--ignore-ssl]
```

`sitemap audit` is an all-in-one command: downloads sitemap, extracts URLs, audits each, outputs CSV.

### 5. Project Mode (Recurring Audits)

Manage named projects with dated run history:

```bash
seo-do project create <name> --url <url>
seo-do project list
seo-do project delete <name>
seo-do project runs <name>
seo-do project pages crawl <name> [--max-pages 100]
seo-do project pages audit <name> [--date <date>]
seo-do project sitemap download <name> [url]
seo-do project sitemap stats <name> [--date <date>]
seo-do project sitemap search <name> <keyword> [--date <date>]
seo-do project sitemap audit <name> [url]
```

Date supports: `2026-03-30`, `yesterday`, `last-week`, or defaults to latest run.

## Workflow Recipes

### Basic: Crawl and Audit

```bash
seo-do pages crawl https://www.example.com
# Optional: edit ./state/done.txt to remove unwanted URLs
seo-do pages audit ./state/done.txt
# Result: ./state/audit.csv
```

### Sitemap Audit (Better Coverage)

```bash
seo-do sitemap audit https://www.example.com/sitemap.xml
# Result: ./state/sitemap-audit.csv
```

### Robots.txt Audit

```bash
seo-do robots audit https://www.example.com
# Result: ./state/robots-audit.csv (columns: userAgent, directive, value)
```

### Recurring Audit with Project Mode

```bash
seo-do project create mysite --url https://www.example.com
seo-do project pages crawl mysite
seo-do project pages audit mysite
# Next day — new dated folder automatically
seo-do project pages crawl mysite
seo-do project pages audit mysite
# Compare with previous run
seo-do project pages audit mysite --date yesterday
```

## Audit CSV Output

The audit CSV contains these fields:

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Page URL |
| `title` | string | `<title>` tag content |
| `description` | string | Meta description |
| `canonical` | string | Canonical URL |
| `isRedirect` | TRUE/FALSE | Whether the page redirected |
| `h1Count` | number | Number of `<h1>` tags |
| `h1Text` | string | H1 text (comma-joined if multiple) |
| `h2Count` | number | Number of `<h2>` tags |
| `h2Text` | string | H2 text (comma-joined) |
| `h3Count` | number | Number of `<h3>` tags |
| `h3Text` | string | H3 text (comma-joined) |
| `size` | number | Response body size in bytes |
| `ga4Count` | number | GA4 measurement IDs found |
| `ga4Ids` | string | GA4 IDs (comma-joined) |
| `gtmCount` | number | GTM containers found |
| `gtmIds` | string | GTM IDs (comma-joined) |
| `isBreadcrumb` | TRUE/FALSE | Breadcrumb structured data |
| `isBlogPosting` | TRUE/FALSE | BlogPosting schema |
| `isArticle` | TRUE/FALSE | Article schema |
| `isFaq` | TRUE/FALSE | FAQ schema |
| `isLogo` | TRUE/FALSE | Logo structured data |
| `isSsr` | TRUE/FALSE | Key SEO signals present in raw HTML |
| `countStructureData` | number | Total structured data blocks |

Conventions: booleans as `TRUE`/`FALSE`, missing strings as `""`, multi-value fields comma-joined.

## State Files

| File | Format | Description |
|------|--------|-------------|
| `done.txt` | One URL per line | Successfully crawled URLs |
| `skipped.txt` | `url<TAB>reason` | Skipped URLs with reason |
| `error.txt` | `url<TAB>stage<TAB>message` | Failed URLs with error |
| `audit.csv` | CSV | SEO audit results |
| `html/` | Directory | Cached HTML pages (reused across crawl and audit) |

## Important Notes

- All flags are optional except `--url` on `project create`
- Pages fetched during crawl are cached in `state/html/` — audit reuses them automatically, no re-download
- Delete `state/html/` to force a fresh fetch
- The crawl-then-audit workflow is intentionally split so URLs can be reviewed/edited between steps
- `--ignore-ssl` is useful for staging sites with self-signed certificates
- `isSsr` is a heuristic, not definitive SSR detection
- Single-threaded: pages are fetched sequentially
- CSV output works with Excel, Google Sheets, csvkit, or pandas
