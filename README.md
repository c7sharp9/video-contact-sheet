---
name: Video Contact Sheet
type: code
audience: internal
status: living
catalogued: 2026-04-13
primary_location: ~/Code/video-contact-sheet
repo: c7sharp9/video-contact-sheet
live_url: not deployed (CLI tool; outputs publish to c7sharp9.github.io/client-preview/)
canonical_listing: not listed
deploys_via: local-only
stack: [ffmpeg, node, puppeteer, github-pages]
sisters: [client-preview]
---

# Video Contact Sheet

## What this is

A CLI tool that scans a folder of videos, extracts one poster frame per video with `ffmpeg`, and renders a self-contained HTML contact sheet (optionally a PDF). Built to produce clickable preview pages for clients and to feed the Quick-Share Pages workflow (`client-preview` repo → GitHub Pages).

## Quick start

**Easiest path — interactive wrapper:**
```sh
cd ~/Code/video-contact-sheet
./make-sheet
# → folder picker → title prompt → publish slug prompt → HTML + pageless PDF open
```

**Direct CLI:**
```sh
node generate.js "/path/to/videos" --title "Project Name"
# → output/<folder>.html (single self-contained file)

# With pageless PDF + publish to GitHub Pages:
node generate.js "/path/to/videos" --title "Pretty Title" --pdf --pageless --publish client-slug
```

Published pages land at `https://c7sharp9.github.io/client-preview/<slug>.html`. An auto-generated `index.html` at the root of that repo lists every published page, newest first.

See `generate.js` header comment for all flags, or `CLAUDE.md` for orientation-in-30-seconds.

**Setting up on a new Mac:** see `~/iCloud/.../Projects/business/reframe/video-contact-sheet/docs/setup.html` (step-by-step: Homebrew → ffmpeg → Node → clone → Shortcut).

## Where things are

- **Canonical home:** `~/Code/video-contact-sheet`
- **Live URL:** N/A (tool is local; generated HTML lives in sister repo `client-preview`)
- **Canonical doc:** This file (README.md)
- **AI orientation:** `CLAUDE.md`
- **Roadmap:** `ROADMAP.md`
- **Decisions log:** `DECISIONS.md`
- **Learnings:** `LEARNINGS.md`
- **Catalog listing:** `~/iCloud/.../Projects/catalog/projects.md` → "Personal apps & websites"

## Sister projects

- **Quick-Share Pages (`client-preview`)** — the GitHub Pages repo this tool publishes into. Every `--publish` run drops an HTML file at `~/Code/client-preview/<slug>.html` and pushes. See `catalog/workflows/deploy-quick-share-page.md`.

## Current state

- Status 🟢 Living — first real project run on 2026-04-13 (Vasquez Implant, 40 clips → 652 KB HTML + 653 KB pageless PDF, published to GitHub Pages).
- Puppeteer installed; `--pdf --pageless` verified end-to-end.
- `make-sheet` interactive wrapper added for use from macOS Shortcuts (folder picker, title/slug prompts, opens outputs, copies URL to clipboard).
- Every `--publish` regenerates `client-preview/index.html` — a running, public list of all published pages.
- `ffmpeg` 8.1, `node` 25, `gh` 2.89 installed via Homebrew.

## How to contribute / update

Solo project. Edit files, test with:
```sh
node generate.js ./_test/clips --out _test/out.html --title "Test"
```
Iterate on `template.html` standalone in a browser (it has placeholder data built in).

---

<!--
  Checklist for the next session that touches this project:
  - [ ] Does this README still reflect reality?
  - [ ] Is the frontmatter block up to date?
  - [ ] Is the sister projects list still correct?
  - [ ] Has status graduated from 🟡 Experimental to 🟢 Living?
  - [ ] Is the catalog row in projects.md in sync?
-->
