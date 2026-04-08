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

## Audit from Sitemap (All-in-One)

Download sitemap, extract URLs, run SEO audit, output CSV -- in one command:

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
