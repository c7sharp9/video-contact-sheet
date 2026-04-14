# ROADMAP — Video Contact Sheet

**Last updated:** 2026-04-13
**Status:** 🟢 Living

---

## 🚧 Active

_Nothing active. Tool is in steady use._

---

## ⏭ Next

### Per-project metadata (Frame.io link, client info, deliverables)
Jonathan flagged wanting richer context on the published page beyond title + thumbnails — a Frame.io share URL (to the actual video files), client name, shoot date, deliverables list, notes. Cleanest approach: optional `project.json` sidecar in the video folder that the generator auto-detects and merges into the injected data. Template gets a "Project Info" section above the grid with the Frame.io link as a prominent button. Graceful degrade when no sidecar present.
Effort: S-M
Blockers: none — trigger whenever Jonathan needs it on a real project.

### Metadata beyond filename + duration
Resolution, codec, file size, date-taken. Already collected by `ffprobe`; just a matter of exposing it in `data.json` and adding markup to `template.html`. Trigger when a real run shows what's missing.

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
Wrap the `--publish` flow as a `deploy-video-contact-sheet` skill so Jonathan can say "generate a contact sheet of the Smith wedding footage and publish it" without typing the command. Complements `deploy-quick-share-page` in `catalog/workflows/` and the macOS Shortcut. Lower priority now that the Shortcut exists, but still cheap to add.
Effort: S
Blockers: tool needs ~5 real runs of real usage before deciding which invocation path is the one worth investing in.

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
- **2026-04-13:** Public GitHub repo created at `c7sharp9/video-contact-sheet`; canonical git identity set
- **2026-04-13:** First real-project run — Vasquez Implant, 40 clips, published live
- **2026-04-13:** `npm install` done, `--pdf` verified, `--pageless` flag added (single continuous page sized to content)
- **2026-04-13:** Template — dark theme preserved in PDF, outer border added
- **2026-04-13:** Auto-generated `index.html` at `c7sharp9.github.io/client-preview/` listing all published pages, regenerated on every `--publish`
- **2026-04-13:** `make-sheet` interactive wrapper for macOS Shortcut / Finder Quick Action use
- **2026-04-13:** Cowork-side setup guide at `~/iCloud/.../video-contact-sheet/docs/setup.html` for per-Mac onboarding

---

## ❌ Explicitly not doing

- **Hosting this on a paid/private Pages plan.** Accepted public-URL trade-off for now. Revisit if a client-facing sheet has NDA constraints.
- **Building a web UI for the tool.** CLI + `make-sheet` interactive wrapper + macOS Shortcut cover the invocation ergonomics. Considered and rejected Electron/Tauri native apps and a local web UI — overkill for a solo tool. Shortcut syncs via iCloud across all Macs, which was the real requirement.
