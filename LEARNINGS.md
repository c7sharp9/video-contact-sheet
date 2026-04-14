# LEARNINGS — Video Contact Sheet

> Gotchas, surprises, patterns, workarounds. Short, dated, searchable.

---

## 2026-04-13 — `ffmpeg -ss` before `-i` is fast seek; after `-i` is frame-accurate

**Tags:** ffmpeg, thumbnails

**What happened:** Early prototype used `ffmpeg -i <file> -ss <ts>` (decode-then-seek, frame-accurate but slow). On short testsrc clips it didn't matter; on real videos it would be noticeably slow per thumbnail.

**The fix / insight:** `ffmpeg -ss <ts> -i <file> -frames:v 1 ...` seeks to the nearest keyframe before decoding. Vastly faster, and for a single poster frame the precision loss is invisible. For a frame-exact screenshot you'd put `-ss` after `-i`, but never needed for posters.

---

## 2026-04-13 — GitHub Pages enablement via `gh api`

**Tags:** github-pages, gh-cli

**What happened:** `c7sharp9/client-preview` was public but Pages was disabled (returned 404 on `GET /repos/.../pages`). Couldn't find it in the catalog workflow either — `deploy-quick-share-page.md` assumes Pages is already on.

**The fix / insight:** One-line enable:
```sh
gh api --method POST repos/c7sharp9/client-preview/pages \
  -f "source[branch]=main" -f "source[path]=/"
```
Returns immediately with `status: building`. Site live at the `html_url` within ~30 s.

---

## 2026-04-13 — Foreground Bash breaks when its cwd is moved mid-session

**Tags:** claude-code, shell

**What happened:** We migrated `~/Documents/CODE/Video Thumbnail Contact Sheet` → `~/Code/video-contact-sheet` during the session. After that, every foreground `Bash` call errored with `Path "/Users/ivmms/Documents/CODE/Video Thumbnail Contact Sheet" does not exist` — Claude Code's Bash tool kept trying to restore the old cwd on each turn.

**The fix / insight:** `run_in_background: true` spawns a fresh shell and ignores the persisted cwd check, so all subsequent commands worked. The fix is "don't move your own cwd out from under you" — if a migration is necessary mid-session, `cd` to somewhere stable first (e.g. `~`), then migrate.

**Sees also:** the `cd ~ && ...` prefix pattern used in later commands this session.

---

## 2026-04-13 — `package.json` name field must be lowercase + no spaces

**Tags:** node, npm

**What happened:** First version of `package.json` used `"name": "video-thumbnail-contact-sheet"` — valid. On rename to "Video Contact Sheet" we went with `video-contact-sheet` (kebab-case, lowercase) to stay npm-compatible even though this package never publishes.

**The fix / insight:** Match the repo name exactly, kebab-case, lowercase. No aesthetic reason to do otherwise.

---

## 2026-04-13 — Base64-embedded thumbs make a 3-video sheet ~70 KB

**Tags:** performance, html

**What happened:** Wanted to size-check the self-contained-HTML decision before committing. 3 synthetic 320×180 testsrc clips → one JPEG per clip at 480 px width, q=4 → total HTML file ~70 KB.

**The fix / insight:** Roughly 20–25 KB per video at default settings. A 50-video sheet lands around 1–1.5 MB, a 200-video sheet around 4–5 MB. Still fine for GitHub Pages (100 MB per-file limit, 1 GB repo limit). If a sheet ever pushes past ~10 MB HTML, switch that one to `--no-embed` and serve the sibling `_thumbs/` folder.
