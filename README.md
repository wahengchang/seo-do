# SEO Links Pages Scrape Audit

A lightweight Node.js + TypeScript CLI tool for crawling, auditing, and analyzing SEO signals on small websites (< 100 pages).

## Quick Start

```bash
npm install
npm run build
```

## Basic Usage

**Crawl a website:**

```bash
node dist/cli.js pages crawl https://www.example.com
```

**Audit crawled pages:**

```bash
node dist/cli.js pages audit ./state/done.txt
```

**Output:** `./state/audit.csv`

## All Commands

| Command | Description |
|---------|-------------|
| `pages crawl <url>` | Crawl same-origin pages by following links |
| `pages audit <file>` | Run SEO audit on a URL list, output CSV |
| `sitemap download/stats/search/audit` | Download, inspect, and audit sitemaps |
| `project create/list/delete` | Manage named projects |
| `project pages crawl/audit <name>` | Crawl and audit a project by name (dated output) |
| `project sitemap download/stats/search/audit <name>` | Sitemap tools for a project (dated output) |
| `project runs <name>` | List all past runs for a project |

```bash
node dist/cli.js --help
```

## Docs

Detailed usage guides are in the [`docs/`](./docs/) folder:

- [Crawl & Audit](./docs/crawl-and-audit.md) -- Basic crawl-then-audit workflow
- [Project Mode](./docs/project-mode.md) -- Manage multiple websites with dated runs
- [Sitemap Tools](./docs/sitemap-tools.md) -- Download, search, and audit sitemaps
- [Output Reference](./docs/output-reference.md) -- State files and CSV field definitions
- [Tips & Limitations](./docs/tips-and-limitations.md) -- What to expect and edge cases

## Requirements

- Node.js 22+
- npm

## Dev Mode

```bash
npm run dev -- pages crawl https://www.example.com
npm test
```
