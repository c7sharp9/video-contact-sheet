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
 *   --template <path>   Template HTML file (default: ./template.html)
 *   --no-embed          Write thumbs as files next to html instead of base64
 *   --concurrency <n>   Parallel ffmpeg workers (default: 4)
 *   --publish [slug]    Also copy the HTML into the c7sharp9/client-preview
 *                       repo clone, commit, and push. Optional slug renames
 *                       the file (e.g. --publish smith-wedding-2026).
 *   --repo <path>       Local path to the client-preview clone
 *                       (default: ~/Code/client-preview)
 *   --dry-run           With --publish: copy file but don't commit/push
 *
 * Requires: ffmpeg + ffprobe on PATH. Puppeteer only if --pdf.
 */

import { spawn } from "node:child_process";
import { promises as fs } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import os from "node:os";

const DEFAULT_PUBLISH_REPO = `${process.env.HOME}/Code/client-preview`;

const __dirname = path.dirname(fileURLToPath(import.meta.url));

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
const recursive = !!args.recursive;
const frameSpec = args.frame || "10%";
const width = parseInt(args.width || "480", 10);
const qscale = String(args.quality || 4);
const templatePath = path.resolve(args.template || path.join(__dirname, "template.html"));
const embed = !args["no-embed"];
const concurrency = Math.max(1, parseInt(args.concurrency || "4", 10));
const outPath = path.resolve(
  args.out || path.join(__dirname, "output", `${path.basename(videosDir)}.html`)
);
const makePdf = !!args.pdf;
const publish = args.publish; // true (flag only) or string (slug)
const publishRepo = path.resolve(args.repo || DEFAULT_PUBLISH_REPO);
const dryRun = !!args["dry-run"];

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

  const clean = entries.filter(Boolean);

  const data = {
    title,
    source: videosDir,
    generatedAt: new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC",
    videos: clean,
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
    console.log(`[pdf]   rendering ${pdfPath}`);
    const browser = await puppeteer.launch({ headless: "new" });
    try {
      const page = await browser.newPage();
      await page.goto("file://" + outPath, { waitUntil: "networkidle0" });
      await page.emulateMediaType("print");
      await page.pdf({
        path: pdfPath,
        format: "Letter",
        landscape: true,
        printBackground: true,
        margin: { top: "0.4in", bottom: "0.4in", left: "0.4in", right: "0.4in" },
      });
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
      await git("add", `${slug}.html`);
      // commit only if there are changes
      try {
        await run("git", ["diff", "--cached", "--quiet"], { cwd: publishRepo });
        console.log("[pub]   no changes to commit");
      } catch {
        await git("commit", "-m", `Add contact sheet: ${slug}`);
        await git("push");
        console.log(`[pub]   pushed → https://c7sharp9.github.io/client-preview/${slug}.html`);
      }
    }
  }

  console.log("[done]");
}

main().catch((e) => { console.error(e.message); process.exit(1); });
