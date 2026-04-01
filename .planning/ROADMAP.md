# Roadmap: SEO Audit CLI — v2.1 Robots.txt Support

**Milestone:** v2.1 Robots.txt Support
**Granularity:** Standard
**Coverage:** 10/10 requirements mapped

---

## Phases

- [ ] **Phase 5: Robots Standalone Commands** - Users can download and audit robots.txt from any URL as standalone commands with CSV output
- [ ] **Phase 6: Project Robots Integration** - Users can run robots download and audit within a named project with dated folders and `--date` lookup

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

---

## Progress

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 5. Robots Standalone Commands | 0/2 | Planned | - |
| 6. Project Robots Integration | 0/? | Not started | - |

---

*Roadmap created: 2026-04-01 (v2.1 milestone)*
