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
