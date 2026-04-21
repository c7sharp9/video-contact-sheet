#!/usr/bin/env node
/**
 * Video Thumbnail Contact Sheet generator
 *
 * Usage:
 *   node generate.js <videos-dir> [options]
 *
 * Options:
 *   --out <path>        Output HTML path (default: ./output/<dirname>.html)
 *   --title <string>    Page title (default: folder name)
 *   --recursive         Recurse into subfolders
 *   --frame <spec>      Timestamp for thumbnail (default: 10%).
 *                       Accepts "10%", "3s", "00:00:05"
 *   --width <px>        Thumbnail width in px (default: 480)
 *   --quality <1-31>    JPEG quality (lower = better, default: 4)
 *   --pdf               Also render a PDF via Puppeteer (output.pdf next to html)
 *   --pageless          With --pdf: render as a single continuous page sized
 *                       to the full document (no page breaks). Default is
 *                       Letter landscape.
 *   --template <path>   Template HTML file (default: ./template.html)
 *   --no-embed          Write thumbs as files next to html instead of base64
 *   --concurrency <n>   Parallel ffmpeg workers (default: 4)
 *   --publish [slug]    Also copy the HTML into the c7sharp9/client-preview
 *                       repo clone, commit, and push. Optional slug renames
 *                       the file (e.g. --publish smith-wedding-2026).
 *   --repo <path>       Local path to the client-preview clone
 *                       (default: ~/Code/client-preview)
 *   --dry-run           With --publish: copy file but don't commit/push
 *   --clean             Render a "clean" sheet: no title, header, metadata,
 *                       info section, or footer — just the thumbnail grid.
 *   --client "Name"     Client name (displayed in info section)
 *   --url "https://..." Video files URL (clickable link in info section)
 *   --notes "text"      Freeform notes (displayed in info section)
 *   --contact "Text"    Contact info (defaults: see settings.json)
 *
 * User-editable defaults live in settings.json (contact, publishRepo, etc.).
 * Requires: ffmpeg + ffprobe on PATH. Puppeteer only if --pdf.
 */

import { spawn } from "node:child_process";
import { promises as fs, readFileSync, existsSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// ---------- load user defaults from settings.json ----------
const SETTINGS_PATH = path.join(__dirname, "settings.json");
let SETTINGS = {};
if (existsSync(SETTINGS_PATH)) {
  try { SETTINGS = JSON.parse(readFileSync(SETTINGS_PATH, "utf8")); }
  catch (e) { console.warn(`[warn] Could not parse settings.json: ${e.message}`); }
}
function expandHome(p) { return p && p.startsWith("~") ? p.replace("~", process.env.HOME) : p; }

const DEFAULT_PUBLISH_REPO = expandHome(SETTINGS.publishRepo) || `${process.env.HOME}/Code/client-preview`;
const DEFAULT_CONTACT = SETTINGS.contact || "Jonathan Ayala\njon@innerviewmedia.com";
const DEFAULT_PUBLISH_BASE_URL = SETTINGS.publishBaseUrl || "https://c7sharp9.github.io/client-preview";

const VIDEO_EXTS = new Set([
  ".mp4", ".mov", ".m4v", ".mkv", ".webm", ".avi", ".wmv", ".flv",
  ".mpg", ".mpeg", ".mts", ".m2ts", ".ts", ".3gp", ".ogv", ".vob"
]);

// ---------- arg parsing ----------
function parseArgs(argv) {
  const args = { _: [] };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith("--")) {
      const key = a.slice(2);
      const next = argv[i + 1];
      if (!next || next.startsWith("--")) { args[key] = true; }
      else { args[key] = next; i++; }
    } else { args._.push(a); }
  }
  return args;
}

const args = parseArgs(process.argv.slice(2));
if (!args._[0]) {
  console.error("Usage: node generate.js <videos-dir> [--out path] [--title str] [--recursive] [--frame 10%] [--width 480] [--pdf]");
  process.exit(1);
}

const videosDir = path.resolve(args._[0]);
const title = args.title || path.basename(videosDir);
const client = args.client || "";
const videoUrl = args.url || "";
const notes = args.notes || "";
const contact = args.contact || DEFAULT_CONTACT;
const clean = !!args.clean;
const recursive = !!args.recursive;
const frameSpec = args.frame || SETTINGS.frame || "10%";
const width = parseInt(args.width || SETTINGS.width || "480", 10);
const qscale = String(args.quality || SETTINGS.quality || 4);
const templatePath = path.resolve(args.template || path.join(__dirname, "template.html"));
const embed = !args["no-embed"];
const concurrency = Math.max(1, parseInt(args.concurrency || SETTINGS.concurrency || "4", 10));
const outPath = path.resolve(
  args.out || path.join(__dirname, "output", `${path.basename(videosDir)}.html`)
);
const makePdf = !!args.pdf;
const publish = args.publish; // true (flag only) or string (slug)
const publishRepo = path.resolve(args.repo || DEFAULT_PUBLISH_REPO);
const dryRun = !!args["dry-run"];
const vertical = !!args.vertical;

// ---------- helpers ----------
function run(cmd, argv, opts = {}) {
  return new Promise((resolve, reject) => {
    const p = spawn(cmd, argv, { stdio: ["ignore", "pipe", "pipe"], ...opts });
    let stdout = "", stderr = "";
    p.stdout.on("data", (d) => (stdout += d));
    p.stderr.on("data", (d) => (stderr += d));
    p.on("error", reject);
    p.on("close", (code) => {
      if (code === 0) resolve({ stdout, stderr });
      else reject(new Error(`${cmd} exited ${code}: ${stderr.slice(-400)}`));
    });
  });
}

async function writePublishIndex(repoDir) {
  const entries = await fs.readdir(repoDir, { withFileTypes: true });
  const pages = [];
  for (const e of entries) {
    if (!e.isFile()) continue;
    if (!e.name.endsWith(".html")) continue;
    if (e.name === "index.html") continue;
    const stat = await fs.stat(path.join(repoDir, e.name));
    pages.push({
      name: e.name,
      slug: e.name.replace(/\.html$/, ""),
      mtime: stat.mtime,
    });
  }
  pages.sort((a, b) => b.mtime - a.mtime);

  const rows = pages.map((p) => {
    const date = p.mtime.toISOString().slice(0, 10);
    return `    <li><a href="./${p.name}">${p.slug}</a> <span class="date">${date}</span></li>`;
  }).join("\n");

  const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Quick-Share Pages</title>
<style>
  :root { --bg: #0e0e10; --fg: #ececec; --muted: #8a8a92; --accent: #ffb454; --border: #2a2a2f; }
  * { box-sizing: border-box; }
  html, body { margin: 0; padding: 0; background: var(--bg); color: var(--fg);
    font-family: -apple-system, BlinkMacSystemFont, "Inter", "Segoe UI", sans-serif; }
  body { padding: 48px 56px 80px; max-width: 820px; }
  h1 { margin: 0 0 8px; font-size: 28px; font-weight: 600; letter-spacing: -0.01em; }
  p.lede { color: var(--muted); margin: 0 0 32px; font-size: 14px; }
  ul { list-style: none; padding: 0; margin: 0; border-top: 1px solid var(--border); }
  li { padding: 12px 0; border-bottom: 1px solid var(--border); display: flex;
    justify-content: space-between; align-items: baseline; gap: 16px; }
  a { color: var(--accent); text-decoration: none; font-size: 15px; word-break: break-word; }
  a:hover { text-decoration: underline; }
  .date { color: var(--muted); font-size: 12px; font-variant-numeric: tabular-nums; white-space: nowrap; }
  footer { color: var(--muted); font-size: 11px; margin-top: 40px; }
</style>
</head>
<body>
  <h1>Quick-Share Pages</h1>
  <p class="lede">${pages.length} published page${pages.length === 1 ? "" : "s"}. Newest first.</p>
  <ul>
${rows}
  </ul>
  <footer>Updated ${new Date().toISOString().slice(0, 19).replace("T", " ")} UTC</footer>
</body>
</html>
`;
  await fs.writeFile(path.join(repoDir, "index.html"), html);
}

async function walkVideos(dir, recurse) {
  const out = [];
  const entries = await fs.readdir(dir, { withFileTypes: true });
  for (const e of entries) {
    if (e.name.startsWith(".")) continue;
    const full = path.join(dir, e.name);
    if (e.isDirectory()) {
      if (recurse) out.push(...(await walkVideos(full, true)));
    } else if (e.isFile()) {
      if (VIDEO_EXTS.has(path.extname(e.name).toLowerCase())) out.push(full);
    }
  }
  return out;
}

async function probeDuration(file) {
  try {
    const { stdout } = await run("ffprobe", [
      "-v", "error",
      "-show_entries", "format=duration",
      "-of", "default=nk=1:nw=1",
      file,
    ]);
    const d = parseFloat(stdout.trim());
    return isFinite(d) ? d : 0;
  } catch {
    return 0;
  }
}

function resolveTimestamp(duration) {
  const s = String(frameSpec).trim();
  if (s.endsWith("%")) {
    const pct = Math.max(0, Math.min(99, parseFloat(s)));
    return Math.max(0, (duration || 10) * (pct / 100));
  }
  if (/^\d{1,2}:\d{2}(:\d{2})?/.test(s)) {
    const parts = s.split(":").map(Number);
    return parts.length === 3 ? parts[0] * 3600 + parts[1] * 60 + parts[2] : parts[0] * 60 + parts[1];
  }
  return parseFloat(s) || 0;
}

async function extractThumb(file, duration, outFile) {
  const ts = resolveTimestamp(duration);
  // -ss before -i is fast seek; accurate enough for posters.
  await run("ffmpeg", [
    "-hide_banner", "-loglevel", "error", "-y",
    "-ss", String(ts),
    "-i", file,
    "-frames:v", "1",
    "-vf", `scale=${width}:-2`,
    "-q:v", qscale,
    outFile,
  ]);
}

async function pLimit(items, n, worker) {
  const results = new Array(items.length);
  let i = 0;
  const runners = Array.from({ length: Math.min(n, items.length) }, async () => {
    while (true) {
      const idx = i++;
      if (idx >= items.length) return;
      results[idx] = await worker(items[idx], idx);
    }
  });
  await Promise.all(runners);
  return results;
}

// ---------- main ----------
async function main() {
  // sanity check
  try { await fs.access(videosDir); }
  catch { throw new Error(`Videos folder not found: ${videosDir}`); }

  console.log(`[scan] ${videosDir}${recursive ? " (recursive)" : ""}`);
  const videos = (await walkVideos(videosDir, recursive)).sort((a, b) =>
    a.localeCompare(b, undefined, { numeric: true, sensitivity: "base" })
  );
  if (!videos.length) throw new Error("No video files found.");
  console.log(`[scan] found ${videos.length} video file${videos.length === 1 ? "" : "s"}`);

  const tmpRoot = await fs.mkdtemp(path.join(os.tmpdir(), "contact-sheet-"));
  const assetsDir = embed ? tmpRoot : path.join(path.dirname(outPath), `${path.basename(outPath, ".html")}_thumbs`);
  if (!embed) await fs.mkdir(assetsDir, { recursive: true });

  const entries = await pLimit(videos, concurrency, async (file, idx) => {
    const rel = path.relative(videosDir, file);
    const safe = rel.replace(/[^a-z0-9_.-]+/gi, "_").replace(/\.[^.]+$/, "");
    const thumbFile = path.join(assetsDir, `${String(idx).padStart(4, "0")}_${safe}.jpg`);
    process.stdout.write(`[${idx + 1}/${videos.length}] ${rel}\n`);
    const duration = await probeDuration(file);
    try {
      await extractThumb(file, duration, thumbFile);
    } catch (err) {
      console.warn(`  ! thumbnail failed: ${err.message}`);
      return null;
    }
    let thumbSrc;
    if (embed) {
      const buf = await fs.readFile(thumbFile);
      thumbSrc = `data:image/jpeg;base64,${buf.toString("base64")}`;
    } else {
      thumbSrc = path.relative(path.dirname(outPath), thumbFile).split(path.sep).join("/");
    }
    return {
      name: rel,
      path: file,
      duration,
      thumb: thumbSrc,
    };
  });

  const videoEntries = entries.filter(Boolean);

  const data = {
    title,
    client,
    url: videoUrl,
    notes,
    contact,
    clean,
    source: videosDir,
    generatedAt: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
    orientation: vertical ? "vertical" : "horizontal",
    videos: videoEntries,
  };

  const template = await fs.readFile(templatePath, "utf8");
  const injected = template.replace(
    /<!-- DATA:START -->[\s\S]*?<!-- DATA:END -->/,
    `<!-- DATA:START -->\n<script id="contact-sheet-data" type="application/json">\n${
      JSON.stringify(data).replace(/<\//g, "<\\/")
    }\n</script>\n<!-- DATA:END -->`
  );
  if (!injected.includes("<!-- DATA:END -->")) {
    throw new Error("template.html is missing the <!-- DATA:START --> / <!-- DATA:END --> markers.");
  }

  await fs.mkdir(path.dirname(outPath), { recursive: true });
  await fs.writeFile(outPath, injected);
  console.log(`[write] ${outPath}  (${(injected.length / 1024).toFixed(0)} KB)`);

  if (makePdf) {
    const { default: puppeteer } = await import("puppeteer");
    const pdfPath = outPath.replace(/\.html?$/i, "") + ".pdf";
    const pageless = !!args.pageless;
    console.log(`[pdf]   rendering ${pdfPath}${pageless ? " (pageless)" : ""}`);
    const browser = await puppeteer.launch({ headless: "new" });
    try {
      const page = await browser.newPage();
      if (pageless) {
        await page.setViewport({ width: 1280, height: 800 });
      }
      await page.goto("file://" + outPath, { waitUntil: "networkidle0" });
      if (pageless) {
        // Measure on screen media (template's @media print sets a fixed
        // Letter-landscape @page that would otherwise paginate us).
        const { w, h } = await page.evaluate(() => ({
          w: document.documentElement.scrollWidth,
          h: document.documentElement.scrollHeight,
        }));
        // Override any @page rule in the document with a single page sized
        // exactly to the content.
        await page.addStyleTag({
          content: `@page { size: ${w}px ${h}px; margin: 0; }`,
        });
        await page.pdf({
          path: pdfPath,
          width: `${w}px`,
          height: `${h}px`,
          printBackground: true,
          margin: { top: 0, bottom: 0, left: 0, right: 0 },
          preferCSSPageSize: false,
        });
      } else {
        await page.emulateMediaType("print");
        await page.pdf({
          path: pdfPath,
          format: "Letter",
          landscape: true,
          printBackground: true,
          margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" },
        });
      }
    } finally {
      await browser.close();
    }
    console.log(`[pdf]   ${pdfPath}`);
  }

  if (embed) {
    await fs.rm(tmpRoot, { recursive: true, force: true });
  }

  if (publish) {
    const slug = (typeof publish === "string" ? publish : path.basename(outPath, ".html"))
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "");
    const destFile = path.join(publishRepo, `${slug}.html`);
    try { await fs.access(path.join(publishRepo, ".git")); }
    catch { throw new Error(`--repo ${publishRepo} is not a git repo. Clone c7sharp9/client-preview there first.`); }
    await fs.copyFile(outPath, destFile);
    console.log(`[pub]   copied → ${destFile}`);

    if (dryRun) { console.log("[pub]   dry-run, skipping commit/push"); }
    else {
      const git = (...a) => run("git", a, { cwd: publishRepo });
      // Pull remote changes first (GitHub Actions may have pushed since last run)
      await git("pull", "--rebase", "origin", "main");
      await git("add", `${slug}.html`);
      // commit only if there are changes
      try {
        await run("git", ["diff", "--cached", "--quiet"], { cwd: publishRepo });
        console.log("[pub]   no changes to commit");
      } catch {
        await git("commit", "-m", `Add contact sheet: ${slug}`);
        await git("push");
        console.log(`[pub]   pushed → ${DEFAULT_PUBLISH_BASE_URL}/${slug}.html`);
      }
    }
  }

  console.log("[done]");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
