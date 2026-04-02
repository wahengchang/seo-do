# Requirements: SEO Audit CLI — Robots.txt Support

**Defined:** 2026-04-01
**Core Value:** A developer can register a site by name, run crawl/audit/sitemap commands against it repeatedly, and retrieve any past run by date.

## v2.0 Requirements (Complete)

### Project CRUD

- [x] **PROJ-01**: User can create a named project with a URL (`seo project create <name> --url <url>`), storing `config.json` in `projects/<name>/`
- [x] **PROJ-02**: User can list all projects with name, URL, and creation date (`seo project list`)
- [x] **PROJ-03**: User can delete a project and all its data (`seo project delete <name>`)

### Project Pages

- [x] **PAGES-01**: User can crawl a project by name, output saved to `projects/<name>/<date>/` (`seo project pages crawl <name>`)
- [x] **PAGES-02**: User can audit a project by name, output saved to dated folder (`seo project pages audit <name>`)
- [x] **PAGES-03**: User can retrieve a past pages audit by date (`seo project pages audit <name> --date <date>`)

### Project Sitemap

- [x] **SMAP-01**: User can download sitemaps for a project by name, saved to `projects/<name>/<date>/sitemaps/` (`seo project sitemap download <name>`)
- [x] **SMAP-02**: User can view sitemap stats for a project run (`seo project sitemap stats <name>`)
- [x] **SMAP-03**: User can search sitemap URLs for a project run (`seo project sitemap search <name> <keyword>`)
- [x] **SMAP-04**: User can run full sitemap audit by project name, output to dated folder (`seo project sitemap audit <name>`)

### Run History

- [x] **HIST-01**: User can list all dated runs for a project with run type and file counts (`seo project runs <name>`)
- [x] **HIST-02**: `--date` flag supports exact dates (`2026-03-30`), relative words (`yesterday`, `last-week`), and defaults to latest run

## v2.1 Requirements

### Robots Download

- [ ] **ROBO-01**: User can download robots.txt from a URL and save it to the state folder (`seo robots download <url>`)
- [ ] **ROBO-02**: User can run `robots download <url>` as a standalone command

### Robots Audit

- [ ] **ROBO-03**: User can run `robots audit <url>` to parse robots.txt rules and output CSV
- [ ] **ROBO-04**: CSV contains one row per directive — columns: userAgent, directive, value
- [ ] **ROBO-05**: Parser extracts sitemap references from robots.txt as rows in the CSV
- [ ] **ROBO-06**: Parser extracts crawl-delay directives as rows in the CSV

### Project Integration

- [ ] **RPROJ-01**: User can run `project robots download <name> [url]` to download robots.txt into a dated project folder
- [ ] **RPROJ-02**: User can run `project robots audit <name> [url]` to audit robots.txt into a dated project folder
- [ ] **RPROJ-03**: Project robots commands auto-derive `{project.url}/robots.txt` when no URL is provided
- [ ] **RPROJ-04**: Project robots audit supports `--date` flag for retrieving past runs

### Differential Audit

- [x] **DIFF-01**: User can run `seo project diff <name>` to generate diffs between consecutive dated snapshots
- [x] **DIFF-02**: Command generates ALL missing diffs across all date folders in one invocation
- [x] **DIFF-03**: Pages diff detects added URLs (present in newer, absent in older)
- [x] **DIFF-04**: Pages diff detects removed URLs (present in older, absent in newer)
- [x] **DIFF-05**: Pages diff detects changed URLs with one row per changed field (not one per URL)
- [x] **DIFF-06**: Robots diff detects added and removed directives between consecutive robots CSVs
- [x] **DIFF-07**: Sitemap diff detects added and removed URLs between consecutive sitemap snapshots
- [x] **DIFF-08**: diff.csv output format: resourceType, url, changeType, field, oldValue, newValue
- [x] **DIFF-09**: Missing resource types for a given date are gracefully skipped (no crash)
- [x] **DIFF-10**: Existing diff.csv files are skipped on re-run (idempotent)
- [x] **DIFF-11**: Default display shows the 2 most recent diffs
- [x] **DIFF-12**: `--from` and `--to` flags filter the displayed date range

## Out of Scope

| Feature | Reason |
|---------|--------|
| Cross-check robots.txt with crawled pages | Deferred — would require integration between robots and pages commands |
| Database or backend storage | Plain files only, consistent with existing design |
| Multi-domain projects | One project = one root domain |
| Parallel crawl/audit | Serial execution intentional to avoid rate limiting |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROJ-01 | Phase 1 | Complete |
| PROJ-02 | Phase 1 | Complete |
| PROJ-03 | Phase 1 | Complete |
| PAGES-01 | Phase 2 | Complete |
| PAGES-02 | Phase 2 | Complete |
| PAGES-03 | Phase 2 | Complete |
| HIST-02 | Phase 2 | Complete |
| SMAP-01 | Phase 3 | Complete |
| SMAP-02 | Phase 3 | Complete |
| SMAP-03 | Phase 3 | Complete |
| SMAP-04 | Phase 3 | Complete |
| HIST-01 | Phase 4 | Complete |
| ROBO-01 | Phase 5 | Pending |
| ROBO-02 | Phase 5 | Pending |
| ROBO-03 | Phase 5 | Pending |
| ROBO-04 | Phase 5 | Pending |
| ROBO-05 | Phase 5 | Pending |
| ROBO-06 | Phase 5 | Pending |
| RPROJ-01 | Phase 6 | Pending |
| RPROJ-02 | Phase 6 | Pending |
| RPROJ-03 | Phase 6 | Pending |
| RPROJ-04 | Phase 6 | Pending |
| DIFF-01 | Phase 7 | Complete |
| DIFF-02 | Phase 7 | Complete |
| DIFF-03 | Phase 7 | Complete |
| DIFF-04 | Phase 7 | Complete |
| DIFF-05 | Phase 7 | Complete |
| DIFF-06 | Phase 7 | Complete |
| DIFF-07 | Phase 7 | Complete |
| DIFF-08 | Phase 7 | Complete |
| DIFF-09 | Phase 7 | Complete |
| DIFF-10 | Phase 7 | Complete |
| DIFF-11 | Phase 7 | Complete |
| DIFF-12 | Phase 7 | Complete |

**Coverage:**
- v2.0 requirements: 12 total — all complete
- v2.1 requirements: 22 total
- Mapped to phases: 22/22
- Unmapped: 0

---

*Requirements defined: 2026-04-01*
*Last updated: 2026-04-02 after Phase 7 planning*
