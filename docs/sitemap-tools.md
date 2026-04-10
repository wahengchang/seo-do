# Sitemap Tools

A set of commands for downloading, inspecting, and auditing XML sitemaps.

## Quick Reference

```
sitemap download <sitemap-url>  [--output-dir] [--max-depth] [--ignore-ssl]
sitemap stats                   [--dir]
sitemap search   <keyword>      [--dir]
sitemap audit    <sitemap-url>  [--output] [--output-dir] [--max-depth] [--ignore-ssl]
```

| Flag | Default | Applies to | Description |
|------|---------|------------|-------------|
| `--output-dir <path>` | `./state/sitemaps` | `download`, `audit` | Directory to save XML files |
| `--max-depth <n>` | `99` | `download`, `audit` | Max `<sitemapindex>` recursion depth |
| `--ignore-ssl` | `false` | `download`, `audit` | Skip SSL certificate verification |
| `--dir <path>` | `./state/sitemaps` | `stats`, `search` | Directory containing downloaded XML files |
| `--output <file>` | `./state/sitemap-audit.csv` | `audit` | Audit CSV output path |

All flags are **optional**.

---

## Download a Sitemap

Recursively download `sitemap.xml` (follows Sitemap Index references automatically):

```bash
node dist/cli.js sitemap download https://www.example.com/sitemap.xml
```

Options:

All flags are **optional**.

| Flag | Default | Description |
|------|---------|-------------|
| `--output-dir` | `./state/sitemaps` | Where to save XML files |
| `--max-depth` | `99` | Max recursion depth for sitemap indexes (how many levels of `<sitemapindex>` to follow) |
| `--ignore-ssl` | `false` | Skip SSL certificate verification (useful for staging/self-signed certs) |

Result:

```
state/sitemaps/
  sitemap.xml
  sitemap-pages.xml
  sitemap-blog.xml
  sitemap-products.xml
```

## View Stats

```bash
node dist/cli.js sitemap stats
node dist/cli.js sitemap stats --dir ./state/sitemaps
```

Shows file count, total URLs, and per-file URL counts.

## Search Sitemap URLs

Find all URLs containing a keyword (case-insensitive substring match):

```bash
node dist/cli.js sitemap search price
node dist/cli.js sitemap search price --dir ./state/sitemaps
```

Output:

```
Keyword:  "price"
Matches:  3

  [01-sitemap-pages.xml] https://www.example.com/pricing
  [01-sitemap-pages.xml] https://www.example.com/price-list
  [02-sitemap-blog.xml] https://www.example.com/blog/best-price-guide
```

## Audit Sitemap Structure

Download sitemaps and audit each `<url>` entry for metadata, encoding, and duplicates — no HTTP requests to the listed pages:

```bash
node dist/cli.js sitemap audit https://www.example.com/sitemap.xml
```

Options:

All flags are **optional**.

| Flag | Default | Description |
|------|---------|-------------|
| `--output` | `./state/sitemap-audit.csv` | Audit CSV path |
| `--output-dir` | `./state/sitemaps` | Where to save XML files |
| `--max-depth` | `99` | Max recursion depth for sitemap indexes |
| `--ignore-ssl` | `false` | Skip SSL certificate verification |

Output: `sitemap-audit.csv`

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | URL from `<loc>` |
| `sitemapFile` | string | XML file the entry came from |
| `lastmod` | string | `<lastmod>` value |
| `changefreq` | string | `<changefreq>` value |
| `priority` | string | `<priority>` value |
| `hreflangCount` | number | Number of hreflang alternate links |
| `hreflangValues` | string | Hreflang codes (comma-joined) |
| `isDuplicate` | TRUE/FALSE | TRUE if URL appears more than once across all sitemaps |
| `isUtf8` | TRUE/FALSE | TRUE if the sitemap file is UTF-8 encoded |
| `isValidXml` | TRUE/FALSE | TRUE if well-formed XML with a root element |
| `hasValidNamespace` | TRUE/FALSE | TRUE if the correct `xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"` is present |

**Notes:**
- This command audits the sitemap XML files themselves — it does not fetch or audit the pages listed inside them
- Use `pages audit` or `pages crawl` to run a full SEO audit on page content

## Example: Download First, Then Audit

```bash
# Download and inspect
node dist/cli.js sitemap download https://www.example.com/sitemap.xml --output-dir ./state/sitemaps
node dist/cli.js sitemap stats --dir ./state/sitemaps

# Search for URLs containing a keyword
node dist/cli.js sitemap search important-page --dir ./state/sitemaps

# Run audit on downloaded sitemaps
node dist/cli.js sitemap audit https://www.example.com/sitemap.xml --output-dir ./state/sitemaps --output ./state/sitemap-audit.csv
```

## Example: Find All Blog Posts in Sitemap

```bash
node dist/cli.js sitemap download https://www.example.com/sitemap.xml
node dist/cli.js sitemap search blog
```
