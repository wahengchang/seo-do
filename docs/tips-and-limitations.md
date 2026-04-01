# Tips & Limitations

## What This Tool Does Well

- Fast, lightweight audits for small static sites (< 100 pages)
- Content sites, blogs, corporate sites, small product sites
- Quick CSV output for spreadsheet analysis
- Repeatable audits for tracking changes over time

## Limitations

- **No JavaScript rendering** -- pages that rely on client-side rendering (SPAs, React apps) will show incomplete data. Only raw HTML is analyzed.
- **No database** -- all state is plain text files. This keeps things simple but doesn't scale to thousands of pages.
- **Single-threaded** -- pages are fetched one at a time. Fast enough for small sites, slow for large ones.
- **`isSsr` is heuristic** -- it checks whether key SEO signals (title, headings, structured data) exist in the raw HTML. It's a quick indicator, not a definitive SSR detection.

## Tips

### HTML Cache

Pages fetched during crawl are cached in `state/html/`. When you run `pages audit`, cached pages are reused automatically -- no re-download. Delete `state/html/` to force a fresh fetch.

### Edit `done.txt` Before Auditing

The crawl-then-audit workflow is intentionally split so you can clean up the URL list:

```bash
node dist/cli.js pages crawl https://www.example.com
# Open ./state/done.txt, remove unwanted URLs
node dist/cli.js pages audit ./state/done.txt
```

### Use `--max-pages` to Limit Crawl Scope

```bash
node dist/cli.js pages crawl https://www.example.com --max-pages 20
```

### Use Sitemap Audit for Complete Coverage

Crawling by links may miss orphan pages. If the site has a sitemap, use the sitemap audit:

```bash
node dist/cli.js sitemap audit https://www.example.com/sitemap.xml
```

### Use Project Mode for Recurring Audits

Instead of managing state directories manually:

```bash
node dist/cli.js project create mysite --url https://www.example.com
node dist/cli.js project pages crawl mysite
node dist/cli.js project pages audit mysite
# ... next day ...
node dist/cli.js project pages crawl mysite
node dist/cli.js project pages audit mysite
# compare with yesterday
node dist/cli.js project pages audit mysite --date yesterday
```

See [Project Mode](./project-mode.md) for the full workflow.

### Skip SSL Errors

Some staging or internal sites have self-signed certificates:

```bash
node dist/cli.js sitemap download https://staging.example.com/sitemap.xml --ignore-ssl
```

### Combine with Spreadsheet Tools

The CSV output works well with:

- Excel / Google Sheets for filtering and pivot tables
- `csvkit` for command-line analysis (`csvstat`, `csvgrep`)
- Python pandas for scripted analysis
