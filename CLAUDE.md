# Video Contact Sheet

## What this is

A single-file Node CLI that scans a folder of videos, extracts one poster frame per video via `ffmpeg`, and writes a self-contained HTML contact sheet (thumbnails + filenames + durations). Can also publish directly into the sister `client-preview` repo for GitHub Pages sharing.

## Stack

- Node 18+ (installed: node 25 via Homebrew), ES modules, no build step
- `ffmpeg` + `ffprobe` on PATH (Homebrew — `/opt/homebrew/bin/ffmpeg`)
- `puppeteer` installed, used for `--pdf` (optional dep; only required when `--pdf` is passed)
- Output: single `.html` file with thumbnails embedded as base64 data URLs (portable, no folder needed). Optional `.pdf` alongside (Letter-landscape paginated, or `--pageless` for one continuous page).

## How to run locally

```sh
# Interactive wrapper (folder picker, prompts for title + slug, opens outputs)
./make-sheet

# Direct CLI — generates to ./output/<folder>.html
node generate.js "/path/to/videos" --title "Project Name"

# Full-featured: pageless PDF + publish to GitHub Pages (commits + pushes)
node generate.js "/path/to/videos" --title "Pretty Title" --pdf --pageless --publish smith-wedding-2026

# Dry-run publish (copies file, skips git commit/push)
node generate.js "/path/to/videos" --publish slug --dry-run
```

Key flags (full list in `generate.js` JSDoc header):
- `--frame 10%` | `--frame 3s` | `--frame 00:00:05` — timestamp for the poster
- `--width 480` — thumbnail width px
- `--recursive` — recurse into subfolders
- `--concurrency 4` — parallel ffmpeg workers
- `--pdf` — also render a PDF via Puppeteer (default: Letter landscape paginated)
- `--pageless` — with `--pdf`, render a single continuous page sized to the full document
- `--no-embed` — write thumbs as sibling files instead of base64
- `--publish [slug]` — copy output into `~/Code/client-preview/<slug>.html`, regenerate the repo's `index.html`, commit, push
- `--repo <path>` — override the client-preview clone location

No env vars. No secrets.

There's a `.claude/launch.json` entry called **preview** — it starts a tiny static server on :3000 that serves `_test/output.html` at `/`. Useful for previewing the template with `mcp__Claude_Preview__preview_start`.

## How it deploys

- **The tool itself:** NOT DEPLOYED. Runs locally. No build, no release pipeline.
- **The generated HTML outputs:** land in `c7sharp9/client-preview` (via `--publish`). GitHub Pages auto-serves at `https://c7sharp9.github.io/client-preview/<slug>.html` within ~30 seconds of push. An auto-generated `index.html` at the root of that repo lists every published page, newest first; it's regenerated on every `--publish`.

## Live URL

Tool: none (local CLI).
Example generated output: `https://c7sharp9.github.io/client-preview/<slug>.html` after `--publish`.

## Canonical docs

- `README.md` — frontmatter + project home
- `ROADMAP.md` — what's next
- `DECISIONS.md` — why we built it this way
- `LEARNINGS.md` — gotchas as they come up

Catalog-level:
- `~/iCloud/.../Projects/catalog/projects.md` → "Personal apps & websites" section, sister to Quick-Share Pages
- `~/iCloud/.../Projects/catalog/workflows/deploy-quick-share-page.md` — the publish flow this tool automates

Cowork (iCloud-synced) half:
- `~/iCloud/.../Projects/business/reframe/video-contact-sheet/docs/README.md` — pointer to the repo + Cowork-side notes
- `~/iCloud/.../Projects/business/reframe/video-contact-sheet/docs/setup.html` — per-Mac setup guide (prerequisites, clone steps, Shortcut build, troubleshooting)

## Sister projects

- **`client-preview`** (`~/Code/client-preview`) — the GitHub Pages repo this tool publishes into. Catalogued as "Quick-Share Pages" in the catalog. Before this project existed, share pages were dropped in there by hand. Now `--publish` is the automated path for video-heavy sheets.

## Current state

- Branch is `main`
- Status 🟢 Living — first real run 2026-04-13 (Vasquez Implant, 40 clips, published live)
- Puppeteer installed; `--pdf --pageless` verified end-to-end
- `make-sheet` interactive wrapper exists for Shortcuts / Quick Action use
- Auto-generated `index.html` in `client-preview` regenerates on every `--publish`
- Test scaffolding (`_test/`, `output/`) is gitignored — recreate ad hoc with `ffmpeg -f lavfi -i testsrc=...` when debugging
- **Next on deck (see ROADMAP):** per-project metadata via sidecar `project.json` (Frame.io URL, client info, deliverables) rendered as a "Project Info" section above the grid

## Don't get tripped up by

- **Template injection markers.** `template.html` uses HTML comments `<!-- DATA:START -->` / `<!-- DATA:END -->` and a `<script id="contact-sheet-data" type="application/json">` block between them. The generator string-replaces the whole region. If you restyle the template, leave those markers untouched.
- **Thumb seek is fast-seek, not frame-accurate.** `ffmpeg -ss <ts> -i <file>` (before `-i`) uses fast keyframe seek. For a poster that's fine; if you ever need exact frames, move `-ss` after `-i` (much slower).
- **`--publish` commits with no changes is a no-op.** The generator checks `git diff --cached --quiet` before committing; if the HTML is identical to what's already pushed, it logs "no changes to commit" and exits cleanly.
- **`client-preview` is public.** Any slug you push is discoverable at the URL. Don't use this for anything sensitive without moving to a different host.
- **`@page` CSS vs puppeteer PDF size.** `template.html`'s `@media print` contains `@page { size: Letter landscape }`. If you `emulateMediaType("print")`, that `@page` rule is active and Chrome paginates to Letter landscape *regardless* of the `width`/`height` you pass to `page.pdf()`. `--pageless` works around this by (a) not emulating print media and (b) injecting a matching `@page` with `page.addStyleTag()`. Full story in LEARNINGS 2026-04-13.
- **`make-sheet` assumes Homebrew paths.** It prepends `/opt/homebrew/bin:/usr/local/bin` so Shortcuts and Quick Actions can find `ffmpeg` / `node` / `git` (those context's PATHs are minimal by default). If you're on an unusual setup, this is where to look.
