# Crawl & Audit

The core workflow: crawl a site, review the URL list, then run an SEO audit.

## Quick Reference

```
pages crawl <url>          [--state-dir] [--max-pages]
pages audit <input-file>   [--output] [--origin]
```

| Flag | Default | Applies to | Description |
|------|---------|------------|-------------|
| `--state-dir <path>` | `./state` | `pages crawl` | Directory for state files |
| `--max-pages <number>` | `100` | `pages crawl` | Stop after this many pages |
| `--output <file>` | `./state/audit.csv` | `pages audit` | Output CSV path |
| `--origin <url>` | auto-detected | `pages audit` | Override site origin for canonical checks |

All flags are **optional**.

---

## Step 1: Crawl

Start from a seed URL. The crawler follows same-origin links and writes discovered pages to `state/done.txt`.

```bash
node dist/cli.js pages crawl https://www.example.com
```

Options:

```bash
node dist/cli.js pages crawl https://www.example.com --state-dir ./state --max-pages 100
```

| Flag | Default | Description |
|------|---------|-------------|
| `--state-dir` | `./state` | Directory for state files |
| `--max-pages` | `100` | Stop after this many pages |

## Step 2: Review the URL List

Open `./state/done.txt` and remove any URLs you don't want to audit:

- Parameter pages (`?page=2`, `?sort=...`)
- Dynamic or duplicate content pages
- Non-content pages (login, admin, etc.)

## Step 3: Audit

```bash
node dist/cli.js pages audit ./state/done.txt
```

Options:

```bash
node dist/cli.js pages audit ./state/done.txt --output ./state/audit.csv --origin https://example.com
```

| Flag | Default | Description |
|------|---------|-------------|
| `--output` | `./state/audit.csv` | Output CSV path |
| `--origin` | auto-detected | Override the site origin for canonical checks |

## Step 4: Analyze

Open `./state/audit.csv` in your spreadsheet tool. See [Output Reference](./output-reference.md) for field details.

## Example: Full Run

```bash
node dist/cli.js pages crawl https://www.example.com
# edit ./state/done.txt if needed
node dist/cli.js pages audit ./state/done.txt
# open ./state/audit.csv
```

## Example: Sitemap Audit

If the site has a `sitemap.xml`, use the sitemap tools instead of link-crawling:

```bash
node dist/cli.js sitemap audit https://www.example.com/sitemap.xml
```

See [Sitemap Tools](./sitemap-tools.md) for the full sitemap workflow.
