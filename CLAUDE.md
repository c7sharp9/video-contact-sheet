# Video Contact Sheet

## What this is

A single-file Node CLI that scans a folder of videos, extracts one poster frame per video via `ffmpeg`, and writes a self-contained HTML contact sheet (thumbnails + filenames + durations). Can also publish directly into the sister `client-preview` repo for GitHub Pages sharing.

## Stack

- Node 18+ (installed: node 25 via Homebrew), ES modules, no build step
- `ffmpeg` + `ffprobe` on PATH (Homebrew — `/opt/homebrew/bin/ffmpeg`)
- `puppeteer` as optional dep for `--pdf` (not installed until `npm install`)
- Output: single `.html` file with thumbnails embedded as base64 data URLs (portable, no folder needed)

## How to run locally

```sh
# Generate a contact sheet to ./output/<folder>.html
node generate.js "/path/to/videos" --title "Project Name"

# Test with synthetic clips (if you make a _test/clips folder with lavfi testsrc mp4s)
node generate.js ./_test/clips --out _test/out.html

# Publish straight into c7sharp9/client-preview (commits + pushes; add --dry-run to skip push)
node generate.js "/path/to/videos" --publish smith-wedding-2026
```

Key flags (full list in `generate.js` JSDoc header):
- `--frame 10%` | `--frame 3s` | `--frame 00:00:05` — timestamp for the poster
- `--width 480` — thumbnail width px
- `--recursive` — recurse into subfolders
- `--concurrency 4` — parallel ffmpeg workers
- `--pdf` — also render a Letter-landscape PDF via Puppeteer
- `--no-embed` — write thumbs as sibling files instead of base64
- `--publish [slug]` — copy output into `~/Code/client-preview/<slug>.html`, commit, push
- `--repo <path>` — override the client-preview clone location

No env vars. No secrets.

There's a `.claude/launch.json` entry called **preview** — it starts a tiny static server on :3000 that serves `_test/output.html` at `/`. Useful for previewing the template with `mcp__Claude_Preview__preview_start`.

## How it deploys

- **The tool itself:** NOT DEPLOYED. Runs locally. No build, no release pipeline.
- **The generated HTML outputs:** land in `c7sharp9/client-preview` (via `--publish`). GitHub Pages auto-serves at `https://c7sharp9.github.io/client-preview/<slug>.html` within ~30 seconds of push.

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

## Sister projects

- **`client-preview`** (`~/Code/client-preview`) — the GitHub Pages repo this tool publishes into. Catalogued as "Quick-Share Pages" in the catalog. Before this project existed, share pages were dropped in there by hand. Now `--publish` is the automated path for video-heavy sheets.

## Current state

- Branch is `main`
- Status 🟡 Experimental — end-to-end verified with synthetic clips, not yet used on a real project
- Known todo: Puppeteer isn't installed yet (`package.json` lists it; `npm install` needed before `--pdf` works)
- Known todo: no `index.html` in `~/Code/client-preview` listing all published sheets — if that becomes useful, generate one from the filesystem
- Test scaffolding (`_test/`) is gitignored — recreate it ad hoc with `ffmpeg -f lavfi -i testsrc=...` when debugging

## Don't get tripped up by

- **Template injection markers.** `template.html` uses HTML comments `<!-- DATA:START -->` / `<!-- DATA:END -->` and a `<script id="contact-sheet-data" type="application/json">` block between them. The generator string-replaces the whole region. If you restyle the template, leave those markers untouched.
- **Thumb seek is fast-seek, not frame-accurate.** `ffmpeg -ss <ts> -i <file>` (before `-i`) uses fast keyframe seek. For a poster that's fine; if you ever need exact frames, move `-ss` after `-i` (much slower).
- **`--publish` commits with no changes is a no-op.** The generator checks `git diff --cached --quiet` before committing; if the HTML is identical to what's already pushed, it logs "no changes to commit" and exits cleanly.
- **`client-preview` is public.** Any slug you push is discoverable at the URL. Don't use this for anything sensitive without moving to a different host.
