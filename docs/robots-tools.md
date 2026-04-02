# Robots.txt Tools

Download and audit robots.txt files from any website.

## Commands

### Download

Fetch a site's robots.txt and save it locally:

```bash
seo-do robots download https://www.example.com
```

Output: `./state/robots.txt`

Options:

| Flag | Default | Description |
|------|---------|-------------|
| `--output <file>` | `./state/robots.txt` | Output file path |
| `--ignore-ssl` | off | Skip SSL certificate verification |

### Audit

Fetch robots.txt, parse all directives, and export as CSV:

```bash
seo-do robots audit https://www.example.com
```

Output: `./state/robots-audit.csv`

Options:

| Flag | Default | Description |
|------|---------|-------------|
| `--output <file>` | `./state/robots-audit.csv` | CSV output file path |
| `--ignore-ssl` | off | Skip SSL certificate verification |

## URL Handling

You can pass either a domain or a full robots.txt URL:

```bash
# These are equivalent:
seo-do robots download https://www.example.com
seo-do robots download https://www.example.com/robots.txt
```

## Audit CSV Output

The robots audit CSV has three columns:

| Column | Description |
|--------|-------------|
| `userAgent` | The User-agent the rule applies to (e.g. `*`, `Googlebot`) |
| `directive` | The directive type (`Disallow`, `Allow`, `Sitemap`, `Crawl-delay`) |
| `value` | The directive value (e.g. `/admin`, `/sitemap.xml`) |

Sitemap directives appear with an empty `userAgent` since they are global.

## Examples

### Quick check what a site blocks

```bash
seo-do robots audit https://www.example.com
# Open ./state/robots-audit.csv in a spreadsheet
# Filter by directive = "Disallow" to see blocked paths
```

### Save robots.txt for comparison

```bash
seo-do robots download https://www.example.com --output ./robots-before.txt
# ... wait for changes ...
seo-do robots download https://www.example.com --output ./robots-after.txt
diff ./robots-before.txt ./robots-after.txt
```
