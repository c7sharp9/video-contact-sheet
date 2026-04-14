# ROADMAP — Video Contact Sheet

**Last updated:** 2026-04-13
**Status:** 🟡 Experimental

---

## 🚧 Active

### First real-project run
- **Why:** The tool is only proven on synthetic ffmpeg testsrc clips. Need one real client folder through the pipeline end-to-end to shake out edge cases (weird filenames, mixed codecs, giant files, external drive I/O).
- **What:** Point `generate.js` at a real videos folder (NAS, external SSD, or local) → generate → `--publish` to `client-preview` → send the URL to a real recipient.
- **Acceptance criteria:** HTML renders correctly, durations are accurate, all videos in the folder produced a thumbnail (no silent skips), publish flow committed + pushed without needing manual intervention.
- **Started:** 2026-04-13
- **Expected:** next session with a real folder in hand

---

## ⏭ Next

### `npm install` + verify `--pdf`
Puppeteer is in `package.json` but not installed. On first real use that wants a PDF alongside the HTML, run `npm install` and verify the output PDF pagination + font rendering on Letter landscape. If it's ugly, tune the `@media print` block in `template.html`.

### Listing page for `client-preview`
Right now `c7sharp9.github.io/client-preview/` has no index — visitors need the exact filename. A tiny auto-generated `index.html` listing all `.html` files in the repo (excluding `archive/`) would make the bare URL useful. Either wire it into `generate.js` as a `--reindex` flag, or make it a separate workflow doc.

### Metadata beyond filename + duration
User may want resolution, codec, file size, or date-taken on each card. Already collected by `ffprobe`; just a matter of exposing it in `data.json` and adding markup to `template.html`. Trigger when first real-project run shows what's missing.

---

## 📋 Menu — future possibilities

### Mini-contact-sheet mode (original option B)
Instead of one poster per video, render a 3×3 grid of timecoded stills inside each card — the classic "contact sheet" look. ffmpeg `select` filter + tile filter can produce this in one pass. Effort: M. Would need a template variant or a mode switch in CSS.
Effort: M
Blockers: none

### Frame strip mode (original option C)
Horizontal strip of 5 timecoded stills per video instead of a poster or a grid. Same ffmpeg approach as mini-contact-sheet, different layout.
Effort: S
Blockers: needs mini-contact-sheet to land first (same infrastructure)

### Scene-aware thumbnail selection
Instead of picking the 10% frame (which is often black or a title card), use ffmpeg's `thumbnail` filter to select the most representative frame algorithmically. Effort: S.
Effort: S
Blockers: none

### Per-output config file
Let each contact sheet have a sibling `.config.json` that overrides title, columns, per-video captions, visual theme. Useful when iterating on one client's sheet without touching the global template.
Effort: M
Blockers: none

### Turn into a Claude Code skill
Wrap the `--publish` flow as a `deploy-video-contact-sheet` skill so Jonathan can say "generate a contact sheet of the Smith wedding footage and publish it" without typing the command. Complements `deploy-quick-share-page` in `catalog/workflows/`.
Effort: S
Blockers: tool needs to stabilize first (~5 real runs)

### Watermark / header customization
Add a brand strip, client logo, or date banner at the top of the HTML. Easy with a few CSS vars and an optional `--logo <path>` flag (inlines as base64).
Effort: S
Blockers: none

### Password-protected outputs
Add a JS-side access code gate (not real security, just a speed bump) for drafts that shouldn't be indexable. Or move sensitive sheets to a private host entirely.
Effort: S (JS gate) / M (private host)
Blockers: discussion with Jonathan about threat model

---

## ✅ Recently completed

- **2026-04-13:** Initial scaffold — `generate.js`, `template.html`, `package.json`, `.gitignore`, `README`
- **2026-04-13:** Homebrew install of ffmpeg 8.1, node 25, gh 2.89
- **2026-04-13:** GitHub Pages enabled on `c7sharp9/client-preview` (main/root)
- **2026-04-13:** `--publish` flag wired, dry-run verified end-to-end
- **2026-04-13:** Migrated to canonical `~/Code/video-contact-sheet` path; renamed from "Video Thumbnail Contact Sheet"

---

## ❌ Explicitly not doing

- **Hosting this on a paid/private Pages plan.** Accepted public-URL trade-off for now. Revisit if a client-facing sheet has NDA constraints.
- **Building a web UI for the tool.** CLI is enough. If invocation gets tiresome, the Claude Code skill (in Menu) is the answer, not a UI.
