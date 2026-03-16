# SEO CLI Tool – Requirements

## 1. Overview

This project is a **personal SEO CLI tool** built with **Node.js** designed to analyze small websites.

The tool performs two main operations:

1. **Crawl URLs within a domain**
2. **Run SEO audit on each page**

### Key Constraints

* Target websites: **< 100 pages**
* **Single-threaded crawling (1 concurrent request)**
* CLI-based tool
* Designed for **personal usage**
* Simplicity and maintainability are prioritized over performance

---

# 2. High-Level Architecture

The system operates in two independent stages:

1. **Crawler**
2. **Audit**

This allows manual intervention between steps (e.g., removing unwanted URLs).

```
seed URL
   │
   ▼
crawl domain
   │
   ▼
done.txt (list of URLs)
   │
   ▼
SEO audit
   │
   ▼
audit.csv
```

---

# 3. CLI Commands

The CLI exposes two commands.

## Crawl

```
seo crawl <url>
```

Example:

```
seo crawl https://abc.com
```

This command:

* Crawls the domain
* Collects internal URLs
* Writes results to state files

---

## Audit

```
seo audit <file>
```

Example:

```
seo audit ./state/done.txt
```

This command:

* Reads URLs from file
* Fetches each page
* Extracts SEO signals
* Outputs a structured report

---

# 4. File Structure

The tool stores state in a simple file-based structure.

```
project/
  state/
    queue.txt
    done.txt
    skipped.txt
    error.txt
    audit.csv
```

### queue.txt

URLs waiting to be crawled.

### done.txt

Successfully crawled URLs.

Format:

```
https://abc.com/
https://abc.com/about
https://abc.com/blog/post-1
```

One URL per line.

### skipped.txt

URLs ignored during crawling.

Examples:

* external links
* invalid URLs
* non-HTML resources
* duplicates

### error.txt

URLs that failed to fetch.

### audit.csv

Final SEO audit output.

---

# 5. Crawl Requirements

## 5.1 Crawl Scope

The crawler must:

* Only crawl **same-origin URLs**
* Ignore external domains

Example:

Allowed:

```
https://abc.com/about
https://abc.com/blog
```

Not allowed:

```
https://twitter.com/abc
https://cdn.abc.com/file.pdf
```

---

## 5.2 Crawl Logic

Crawler operates using a simple loop.

Pseudo workflow:

```
seed URL
add to queue

while queue not empty
    fetch URL
    extract links
    normalize links
    filter links
    deduplicate
    append new URLs to queue
    move URL to done
```

Concurrency:

```
1 request at a time
```

Implementation options:

* `for` loop
* `while` loop

---

# 6. Link Extraction

The crawler extracts links from:

```
<a href="">
```

Links must be:

1. Converted to absolute URLs
2. Normalized
3. Filtered

---

# 7. URL Normalization Rules

To prevent duplicate crawling, URLs must be normalized.

Rules:

### Remove fragments

```
/page#section → /page
```

---

### Convert relative URLs

```
/about → https://abc.com/about
```

---

### Ignore protocols

Ignore:

```
mailto:
tel:
javascript:
```

---

### Remove tracking parameters

Remove:

```
utm_source
utm_medium
utm_campaign
utm_term
utm_content
```

Example:

```
/page?utm_source=twitter
→
/page
```

---

### Same-origin restriction

Only URLs matching the original origin are allowed.

```
origin = https://abc.com
```

---

# 8. Crawl Filtering

The crawler should skip:

### External links

```
https://external.com
```

### Non-HTML resources

Examples:

```
.pdf
.jpg
.png
.zip
.mp4
```

### Invalid URLs

Malformed links.

---

# 9. Manual URL Editing

After crawling completes:

Users may manually edit:

```
state/done.txt
```

Example use case:

Remove dynamic URLs:

```
/notes/1
/notes/2
/notes/3
```

Keep only:

```
/notes/1
```

This manual step is an intentional feature.

---

# 10. Audit Requirements

The audit stage analyzes each URL in the input file.

Workflow:

```
read URLs
fetch page
extract SEO signals
write results
```

---

# 11. Audit Output

The audit output format is:

```
CSV
```

File:

```
state/audit.csv
```

---

# 12. Audit Fields (v1)

The following fields must be collected.

### URL

```
url
```

The page URL.

---

### HTTP Status

```
status_code
```

Example:

```
200
301
404
```

---

### Content Type

```
content_type
```

Example:

```
text/html
```

---

### Title

```
title
title_length
```

Extract from:

```
<title>
```

---

### Meta Description

```
meta_description
meta_description_length
```

Extract from:

```
<meta name="description">
```

---

### H1

```
h1
h1_count
```

Extract from:

```
<h1>
```

---

### Canonical

```
canonical
```

Extract from:

```
<link rel="canonical">
```

---

### Robots Meta

```
meta_robots
```

Extract from:

```
<meta name="robots">
```

---

### X-Robots-Tag

```
x_robots_tag
```

Extract from HTTP response headers.

---

### Word Count

```
word_count
```

Total visible words.

---

### Internal Links

```
internal_link_count
```

Number of links pointing to same domain.

---

### External Links

```
external_link_count
```

Number of links pointing outside domain.

---

### Indexability Signals

```
has_noindex
has_nofollow
```

Derived from robots directives.

---

# 13. Error Handling

If a page fails to load:

* record in `error.txt`
* continue processing

---

# 14. Performance Constraints

Because the crawler targets small sites:

* max pages: **~100**
* concurrency: **1**
* memory requirements: minimal

No need for:

* distributed crawling
* worker pools
* queue databases
* headless browser

---

# 15. Non-Goals

The following features are intentionally **not included**:

* JavaScript rendering
* distributed crawling
* parallel workers
* database-backed queues
* advanced crawl scheduling
* automatic canonical decision logic

---

# 16. Future Enhancements (Optional)

Possible future features:

### Broken link detection

Detect links returning:

```
404
500
```

---

### Redirect chain analysis

Example:

```
A → B → C
```

---

### Duplicate metadata detection

Identify duplicate:

* titles
* meta descriptions

---

### Thin content detection

Pages with:

```
word_count < threshold
```

---

### Sitemap comparison

Compare:

```
sitemap.xml
vs
crawled URLs
```

---

# 17. Summary

This tool prioritizes:

* simplicity
* transparency
* manual control
* deterministic outputs

The workflow is intentionally straightforward:

```
crawl → edit URLs → audit → analyze results
```

This approach keeps the system maintainable while still providing valuable SEO insights.
