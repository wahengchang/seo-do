# seo-do

A CLI tool that automates the tedious parts of daily SEO work:

- **Crawl** a site and collect every page
- **Audit** title, description, headings, canonical, structured data, GA4/GTM — exported as CSV
- **Download and search** sitemaps locally
- **Download and audit** robots.txt — parse rules into structured CSV
- **Track changes over time** with dated project runs — compare today vs yesterday
- **Archive TDK history** so you know exactly when a title or description changed

No browser needed. No database. Just plain files you can open in any spreadsheet.

## Install

**Global (recommended):**

```bash
npm install -g seo-do
```

**Local (within a project):**

```bash
npm install seo-do
npx seo-do pages crawl https://www.example.com
```

**From source (development):**

```bash
git clone https://github.com/wahengchang/seo-do.git
cd seo-do
npm install
npm run build
npm link
```

## Basic Usage

```bash
seo-do pages crawl https://www.example.com
seo-do pages audit ./state/done.txt
```

**Output:** `./state/audit.csv`

## All Commands

| Command | Description |
|---------|-------------|
| `pages crawl <url>` | Crawl same-origin pages by following links |
| `pages audit <file>` | Run SEO audit on a URL list, output CSV |
| `sitemap download/stats/search/audit` | Download, inspect, and audit sitemaps |
| `robots download <url>` | Download robots.txt from a domain |
| `robots audit <url>` | Parse robots.txt rules into CSV |
| `project create/list/delete` | Manage named projects |
| `project pages crawl/audit <name>` | Crawl and audit a project by name (dated output) |
| `project sitemap download/stats/search/audit <name>` | Sitemap tools for a project (dated output) |
| `project diff <name>` | Compare consecutive runs and report changes (diff CSV) |
| `project runs <name>` | List all past runs for a project |

```bash
seo-do --help
```

## Docs

Detailed usage guides are in the [`docs/`](./docs/) folder:

- [Crawl & Audit](./docs/crawl-and-audit.md) -- Basic crawl-then-audit workflow
- [Project Mode](./docs/project-mode.md) -- Manage multiple websites with dated runs
- [Sitemap Tools](./docs/sitemap-tools.md) -- Download, search, and audit sitemaps
- [Robots.txt Tools](./docs/robots-tools.md) -- Download and audit robots.txt
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

## Links

- [GitHub](https://github.com/wahengchang/seo-do)
- [npm](https://www.npmjs.com/package/seo-do)
- [Issues](https://github.com/wahengchang/seo-do/issues)

## License

MIT
