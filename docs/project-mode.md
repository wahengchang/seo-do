# Project Mode

Manage multiple websites as named projects. Each project maps a name to a URL and organizes all crawl/audit output into dated folders for easy history tracking.

## Quick Reference

```
project create <name> --url <url>   [--projects-dir]
project list                        [--projects-dir]
project delete <name>               [--projects-dir]
project runs <name>                 [--projects-dir]
project pages crawl <name>          [--projects-dir] [--max-pages]
project pages audit <name>          [--projects-dir] [--date]
project sitemap download <name> [url] [--projects-dir] [--max-depth] [--ignore-ssl]
project sitemap stats <name>        [--projects-dir] [--date]
project sitemap search <name> <kw>  [--projects-dir] [--date]
project sitemap audit <name> [url]   [--projects-dir] [--max-depth] [--ignore-ssl]
```

| Flag | Default | Description |
|------|---------|-------------|
| `--projects-dir <path>` | `./projects` | Directory where projects are stored |
| `--url <url>` | (required) | Root URL for the project (create only) |
| `--date <date>` | latest run | Date lookup: `2026-03-30`, `yesterday`, `last-week` |
| `--max-pages <number>` | `100` | Max pages to crawl |
| `--max-depth <n>` | `3` | Max sitemap index recursion depth |
| `--ignore-ssl` | `false` | Skip SSL certificate verification |

All flags are **optional** except `--url` on `create`.

---

## Create a Project

```bash
node dist/cli.js project create mysite --url https://www.example.com
```

This creates `projects/mysite/config.json` with the project URL and creation date.

## List Projects

```bash
node dist/cli.js project list
```

Output:

```
Name    URL                        Created
mysite  https://www.example.com    2026-03-31
blog    https://blog.example.com   2026-03-28
```

## Delete a Project

```bash
node dist/cli.js project delete mysite
```

Removes the project directory and all its data.

---

## Crawl and Audit by Project Name

Instead of passing URLs and managing folders manually:

```bash
# Crawl — output goes to projects/mysite/2026-03-31/
node dist/cli.js project pages crawl mysite

# Audit — reads done.txt from today's folder
node dist/cli.js project pages audit mysite
```

Each run creates a dated folder:

```
projects/
  mysite/
    config.json
    2026-03-30/
      done.txt
      audit.csv
    2026-03-31/
      done.txt
      audit.csv
```

## Retrieve Past Audits

```bash
# Latest run (default)
node dist/cli.js project pages audit mysite

# Specific date
node dist/cli.js project pages audit mysite --date 2026-03-30

# Relative dates
node dist/cli.js project pages audit mysite --date yesterday
node dist/cli.js project pages audit mysite --date last-week
```

If no run exists for the requested date, you'll see available dates:

```
Error: No run found for date 2026-03-29. Available runs: 2026-03-28, 2026-03-30, 2026-03-31
```

---

## Sitemap Tools by Project Name

All standalone `sitemap` commands have project equivalents:

```bash
# Download sitemaps
node dist/cli.js project sitemap download mysite

# View stats
node dist/cli.js project sitemap stats mysite

# Search for URLs
node dist/cli.js project sitemap search mysite pricing

# Full sitemap audit
node dist/cli.js project sitemap audit mysite
```

Sitemap files go in `projects/<name>/<date>/sitemaps/`. The sitemap URL defaults to `<project-url>/sitemap.xml`, but you can provide a custom one:

```bash
node dist/cli.js project sitemap download mysite https://www.example.com/custom-sitemap.xml
node dist/cli.js project sitemap audit mysite https://www.example.com/custom-sitemap.xml
```

The `--date` flag works on `stats` and `search` to look up past runs:

```bash
node dist/cli.js project sitemap stats mysite --date yesterday
node dist/cli.js project sitemap search mysite blog --date 2026-03-28
```

---

## View Run History

```bash
node dist/cli.js project runs mysite
```

Output:

```
Date        Type            Files
2026-03-31  pages+sitemap   8
2026-03-30  pages           3
2026-03-28  sitemap         5
```

---

## Example: Full Project Workflow

```bash
# Set up project
node dist/cli.js project create mysite --url https://www.example.com

# Day 1: crawl and audit
node dist/cli.js project pages crawl mysite
node dist/cli.js project pages audit mysite

# Day 1: also grab sitemap
node dist/cli.js project sitemap audit mysite

# Day 2: run again (new dated folder)
node dist/cli.js project pages crawl mysite
node dist/cli.js project pages audit mysite

# Compare: look at yesterday's audit
node dist/cli.js project pages audit mysite --date yesterday

# See all runs
node dist/cli.js project runs mysite
```
