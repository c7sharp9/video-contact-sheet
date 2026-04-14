# DECISIONS — Video Contact Sheet

> Chronological ADR-lite. New decisions at the bottom.

---

## 2026-04-13 — Single self-contained HTML file (base64 thumbnails) as the default output

**Context:** Needed to decide between (a) one HTML file + sibling `_thumbs/` folder vs. (b) one self-contained HTML with thumbnails as base64 data URLs.

**Alternatives considered:**
- Sibling folder — smaller total size, faster page load, but two things to copy around, easy to break links when moving, awkward for `client-preview`'s flat-file convention.
- Base64-embedded — larger HTML file (~30 KB/video at 480 px wide JPEG q=4), but truly portable — one file is the deliverable.

**Chosen:** Base64-embedded by default, with `--no-embed` as an escape hatch.

**Reasoning:** Jonathan explicitly asked for "a single HTML file." Portability matters more than page weight for small-to-medium batches. Plays cleanly with the `client-preview` repo's pattern of one HTML per URL. At 50 videos × 30 KB = ~1.5 MB — fine for GitHub Pages, fine over any modern connection.

**Trade-offs accepted:** Large HTML for large folders. If a sheet ever has 500+ videos, revisit.

**Revisit if:** average sheet size crosses ~10 MB, or page-load time becomes a complaint.

---

## 2026-04-13 — HTML primary, PDF optional (not the other way around)

**Context:** Original ask was "FFmpeg + Puppeteer → PDF contact sheet." User pivoted to HTML primary: "single HTML file would be great… design and information flexibility."

**Alternatives considered:**
- PDF-first, HTML as intermediate artifact — matches the original ask but makes design iteration slower (every tweak = re-render a PDF) and locks out the GitHub Pages distribution path.
- HTML-first, PDF behind `--pdf` flag — cheap HTML iteration, Puppeteer only loads when explicitly needed.

**Chosen:** HTML-first, PDF as opt-in flag (`--pdf`).

**Reasoning:** GitHub Pages hosts HTML for free with clickable links and clean URLs — a PDF there is a download-and-open extra step. HTML is also what the `client-preview` repo is built around. PDF remains available for when someone genuinely wants a print-ready single file.

**Trade-offs accepted:** Puppeteer stays an optional dep (`npm install` on first `--pdf` run). Two code paths to maintain instead of one.

---

## 2026-04-13 — Data injected into template via HTML comment markers + `<script type="application/json">`

**Context:** Template needs to be editable standalone (so CSS tweaks are instant in a browser) but also accept injected data at generation time. Options: string placeholder (e.g. `{{DATA}}`), JS template literal file, comment-region replacement.

**Alternatives considered:**
- `{{MUSTACHE}}` style — pollutes the template so it's not valid HTML and won't render standalone.
- Separate template file in a `.js` module — loses the "open template.html in a browser" workflow.
- HTML comment-region + script tag with placeholder JSON — template is valid standalone HTML with sample data; generator does one `String.replace` on a clearly-marked region.

**Chosen:** Comment-region markers `<!-- DATA:START -->` / `<!-- DATA:END -->` wrapping a `<script id="contact-sheet-data" type="application/json">`.

**Reasoning:** Template is a regular HTML file you can open, tweak, and see. Generator contract is one regex. Data is parsed once client-side, no template language to learn, no XSS risk because it's JSON-encoded with `</` → `<\/` guard.

**Trade-offs accepted:** If someone accidentally deletes the markers while editing the template, generator throws a clear error — acceptable.

---

## 2026-04-13 — Canonical path `~/Code/video-contact-sheet`, kebab-case repo name

**Context:** Project initially built at `~/Documents/CODE/Video Thumbnail Contact Sheet/` (space-separated, wrong path). Catalog convention (projects.md, deploy-quick-share-page.md) says `~/Code/<kebab-case-name>`.

**Alternatives considered:**
- Keep at `~/Documents/CODE/` — less churn, but breaks catalog convention and makes future cross-referencing inconsistent with all other catalogued projects.
- Move to `~/Code/` with canonical naming.

**Chosen:** Move to `~/Code/video-contact-sheet`. Also relocated the `client-preview` clone from `~/Documents/CODE/` to `~/Code/` to align with its existing catalog row.

**Reasoning:** Jonathan asked for this to be an "official project" per catalog conventions. Convention includes path and naming.

**Trade-offs accepted:** Any shell history or scripts referencing the old paths break — none found in this session.

---

## 2026-04-13 — `--publish` is opt-in, not automatic

**Context:** Should generating a sheet auto-publish, or should the two be separate?

**Alternatives considered:**
- Always publish — one command, zero friction.
- Publish only when `--publish` flag is set.

**Chosen:** Opt-in `--publish`.

**Reasoning:** Most runs will be iterative (tweak template, regenerate, inspect locally). Auto-publishing on every iteration would spam the `client-preview` commit history and produce confusing "latest version" behavior for anyone holding an old URL. Explicit `--publish` is a clean checkpoint: "this version is the one I'm sending."

**Trade-offs accepted:** One extra flag to remember. Worth it for commit hygiene.

---

## 2026-04-13 — Dark theme preserved in PDF (not switched to light for print)

**Context:** Original template had `@media print` overrides that flipped to white background + dark text — the classic "print-friendly" pattern. First real PDF rendered fine but was visually inconsistent with the HTML sheet.

**Alternatives considered:**
- Keep the light-for-print convention — better for ink on paper, matches document norms.
- Drop the print overrides — PDF looks identical to the web page, consistent brand feel.

**Chosen:** Drop the print overrides. Dark PDF matches dark HTML.

**Reasoning:** These PDFs are for on-screen review by clients, not printed out. Matching the HTML look removes a needless context switch and looks more considered. If someone ever wants to print one, the PDF works fine on paper (just uses more ink).

**Trade-offs accepted:** More ink if printed. Low-probability case for this use.

---

## 2026-04-13 — `--pageless` PDF as a first-class flag (one continuous page sized to content)

**Context:** User asked for a "pageless" PDF — a single continuous page rather than the default Letter-landscape pagination. Two approaches: replace the default, or add alongside.

**Alternatives considered:**
- Replace default with pageless — simpler, one PDF mode.
- Keep Letter landscape default, add `--pageless` flag — both modes available.

**Chosen:** Keep both; `--pageless` is opt-in.

**Reasoning:** Letter landscape is still the right choice if someone actually does want to print. Pageless is the right choice for on-screen review. Zero cost to keep both since the branching is a 5-line conditional.

**Trade-offs accepted:** Two PDF code paths. One `@page` CSS override trick to remember (see LEARNINGS 2026-04-13 on `@page` vs puppeteer width/height).

---

## 2026-04-13 — macOS Shortcuts (iCloud-synced) over Electron app or local web UI

**Context:** Jonathan needed the tool accessible across multiple Macs and didn't want to use the Terminal each time.

**Alternatives considered:**
- Electron/Tauri native .app — full native GUI, distributable, overkill for this.
- Local web UI (Express server on localhost:3000 with drag-and-drop) — familiar tech, but yet-another-server to maintain.
- macOS Automator droplet — simple, but doesn't sync across machines natively.
- macOS Shortcut + `make-sheet` shell wrapper — Shortcut auto-syncs via iCloud; shell wrapper keeps the logic in the repo where it can be git-versioned.

**Chosen:** Shortcut + `make-sheet` wrapper.

**Reasoning:** iCloud sync is the killer feature — build once, works on every Mac signed into the same Apple ID. Shell wrapper lives in the repo (version controlled, single source of truth). Shortcut is a 4-step GUI build, documented in the setup guide. Per-Mac prerequisites (brew, node, ffmpeg, clone) are a one-time 3-minute setup.

**Trade-offs accepted:** User has to manually build the Shortcut once (no way to ship a `.shortcut` file in a git repo cleanly because they're signed). Mitigated by a screenshot-driven setup guide in the Cowork docs folder.

---

## 2026-04-13 — Interactive prompts in a shell wrapper, not in `generate.js`

**Context:** We wanted Shortcuts/Quick Actions to prompt for folder, title, slug. Options: add prompts inside `generate.js`, or wrap it in a shell script that handles the prompts.

**Alternatives considered:**
- Prompts in `generate.js` (via `readline` or inquirer) — keeps everything in Node.
- Prompts in a shell wrapper using `osascript` — dialogs are native macOS.
- Shortcut handles prompts directly, calls `generate.js` with args — couples prompting to the Shortcut, harder to invoke from Terminal.

**Chosen:** `make-sheet` shell wrapper using `osascript` dialogs.

**Reasoning:** Native macOS dialogs look right on macOS (file picker = real Finder picker, not a Node ASCII menu). Keeps `generate.js` pure — it stays a headless, scriptable CLI. Wrapper is thin and callable from Terminal, Shortcut, or Alfred identically.

**Trade-offs accepted:** macOS-only wrapper. If the tool ever needs to run on Linux/Windows, `generate.js` still works — just without the wrapper's conveniences.

---

## 2026-04-13 — Auto-regenerate `client-preview/index.html` on every publish

**Context:** The Pages repo had no index — anyone visiting `c7sharp9.github.io/client-preview/` got a 404 (or GitHub's default listing if directory listing was on). Jonathan asked for a "running document of all URLs published."

**Alternatives considered:**
- Separate script `build-index.js` run manually before push.
- Crontab or GitHub Action that rebuilds the index.
- Bake index generation into `generate.js` — runs automatically on every `--publish`.

**Chosen:** Bake into `generate.js`. Every `--publish` regenerates `index.html` from the filesystem.

**Reasoning:** Zero ceremony — the index can never drift out of sync with the actual files. No CI dependency. No separate command to remember. If someone manually drops a `.html` into the repo and pushes without going through `generate.js`, the next `--publish` will pick it up automatically.

**Trade-offs accepted:** `generate.js` now owns one more concern (a small HTML template inline). Acceptable — it's ~50 lines and tightly scoped to one function (`writePublishIndex`).
