# Roadmap: SEO Audit CLI — v2.1 Robots.txt Support

**Milestone:** v2.1 Robots.txt Support
**Granularity:** Standard
**Coverage:** 10/10 requirements mapped

---

## Phases

- [ ] **Phase 5: Robots Standalone Commands** - Users can download and audit robots.txt from any URL as standalone commands with CSV output
- [ ] **Phase 6: Project Robots Integration** - Users can run robots download and audit within a named project with dated folders and `--date` lookup
- [x] **Phase 7: Differential Audit** - Compare chronological snapshots of pages, robots, and sitemap to detect and report changes over time (completed 2026-04-02)

---

## Phase Details

### Phase 5: Robots Standalone Commands
**Goal**: Users can download robots.txt from any URL and parse its rules into a structured CSV as standalone commands
**Depends on**: Nothing (builds on existing CLI patterns, no new project-layer dependency)
**Requirements**: ROBO-01, ROBO-02, ROBO-03, ROBO-04, ROBO-05, ROBO-06
**Success Criteria** (what must be TRUE):
  1. User can run `seo robots download <url>` and the raw robots.txt content is saved to the state folder
  2. User can run `seo robots audit <url>` and a CSV is produced with one row per directive (userAgent, directive, value)
  3. Disallow and Allow rules for each user-agent appear as individual rows in the CSV
  4. Sitemap references found in robots.txt appear as rows in the CSV with directive type `Sitemap`
  5. Crawl-delay directives appear as rows in the CSV with directive type `Crawl-delay`
**Plans**: 2 plans
Plans:
- [ ] 05-01-PLAN.md — TDD: robots.txt parser, RobotsDirective type, CSV writer with tests
- [ ] 05-02-PLAN.md — CLI: robots download and audit commands wired into CLI

### Phase 6: Project Robots Integration
**Goal**: Users can run robots download and audit against a named project with output saved to dated project folders and `--date` lookup support
**Depends on**: Phase 5
**Requirements**: RPROJ-01, RPROJ-02, RPROJ-03, RPROJ-04
**Success Criteria** (what must be TRUE):
  1. User can run `seo project robots download <name>` and robots.txt is saved to `projects/<name>/<date>/`
  2. User can run `seo project robots audit <name>` and the parsed CSV is saved to `projects/<name>/<date>/`
  3. Omitting the optional `[url]` argument auto-derives the URL from the project's stored config (`{project.url}/robots.txt`)
  4. User can run `seo project robots audit <name> --date <date>` to retrieve a past robots audit run
**Plans**: TBD

### Phase 7: Differential Audit
**Goal**: Users can run `seo project diff <name>` to compare chronological snapshots and generate diff.csv files reporting added, removed, and changed pages/robots/sitemap data between consecutive dated runs
**Depends on**: Phase 6
**Requirements**: DIFF-01, DIFF-02, DIFF-03, DIFF-04, DIFF-05, DIFF-06, DIFF-07, DIFF-08, DIFF-09, DIFF-10, DIFF-11, DIFF-12
**Success Criteria** (what must be TRUE):
  1. User can run `seo project diff <name>` and diff.csv is generated for each consecutive date folder pair
  2. Pages diff detects added/removed URLs and per-field changes for URLs present in both snapshots
  3. Robots diff detects added/removed directives between consecutive robots CSVs
  4. Sitemap diff detects added/removed URLs between consecutive sitemap snapshots
  5. Existing diff.csv files are skipped on re-run (idempotent)
  6. Missing resource types for a given date are gracefully skipped
  7. Default display shows the 2 most recent diffs; `--from`/`--to` flags filter the range
**Plans**: 2 plans
Plans:
- [ ] 07-01-PLAN.md — TDD: DiffRecord type, diff engine (diffPages, diffRobots, diffSitemaps, generateProjectDiffs), writeDiffCsv
- [x] 07-02-PLAN.md — CLI: `seo project diff` command with --from/--to flags and display logic

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Robots Standalone Commands | 0/2 | Planned | - |
| 6. Project Robots Integration | 0/? | Not started | - |
| 7. Differential Audit | 2/2 | Complete   | 2026-04-02 |

---

*Roadmap created: 2026-04-01 (v2.1 milestone)*
