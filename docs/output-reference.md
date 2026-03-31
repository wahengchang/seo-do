# Output Reference

## State Files

All files are written to `--state-dir` (default `./state`).

| File | Format | Description |
|------|--------|-------------|
| `queue.txt` | One URL per line | URLs discovered but not yet crawled |
| `done.txt` | One URL per line | Successfully crawled URLs (editable before audit) |
| `skipped.txt` | `url<TAB>reason` | Skipped URLs with reason |
| `error.txt` | `url<TAB>stage<TAB>message` | Failed URLs with error details |
| `audit.csv` | CSV | Final audit output |

## Audit CSV Fields

Column order matches `sample.csv`:

### Page Basics

| Field | Type | Description |
|-------|------|-------------|
| `url` | string | Page URL |
| `title` | string | `<title>` tag content |
| `description` | string | Meta description |
| `canonical` | string | Canonical URL (`<link rel="canonical">`) |
| `isRedirect` | TRUE/FALSE | Whether the page redirected |
| `size` | number | Response body size in bytes |

### Heading Structure

| Field | Type | Description |
|-------|------|-------------|
| `h1Count` | number | Number of `<h1>` tags |
| `h1Text` | string | H1 text content (comma-joined if multiple) |
| `h2Count` | number | Number of `<h2>` tags |
| `h2Text` | string | H2 text content (comma-joined) |
| `h3Count` | number | Number of `<h3>` tags |
| `h3Text` | string | H3 text content (comma-joined) |

### Tracking Scripts

| Field | Type | Description |
|-------|------|-------------|
| `ga4Count` | number | Number of GA4 measurement IDs found |
| `ga4Ids` | string | GA4 IDs (comma-joined) |
| `gtmCount` | number | Number of GTM containers found |
| `gtmIds` | string | GTM IDs (comma-joined) |

### Structured Data Signals

| Field | Type | Description |
|-------|------|-------------|
| `isBreadcrumb` | TRUE/FALSE | Breadcrumb structured data detected |
| `isBlogPosting` | TRUE/FALSE | BlogPosting schema detected |
| `isArticle` | TRUE/FALSE | Article schema detected |
| `isFaq` | TRUE/FALSE | FAQ schema detected |
| `isLogo` | TRUE/FALSE | Logo structured data detected |
| `isSsr` | TRUE/FALSE | Heuristic: key SEO signals present in raw HTML |
| `countStructureData` | number | Total structured data blocks found |

### Output Conventions

- Booleans: `TRUE` / `FALSE`
- Missing strings: `""`
- Multi-value fields: comma-joined
