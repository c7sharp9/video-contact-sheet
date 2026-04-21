// One-off helper: take each existing contact-sheet HTML in client-preview,
// extract its data block, force clean:true, re-inject into the current
// template.html, and write the result back in place.
//
// Thumbnails are already base64-embedded in the data, so no ffmpeg needed.
//
// Usage: node _rebuild-clean.mjs
import { readFileSync, writeFileSync, readdirSync } from "node:fs";
import path from "node:path";

const REPO = path.join(process.env.HOME, "Code", "client-preview");
const TEMPLATE = readFileSync(path.join(process.cwd(), "template.html"), "utf8");
const DATA_RE = /<script id="contact-sheet-data" type="application\/json">\s*([\s\S]*?)\s*<\/script>/;

const files = readdirSync(REPO).filter(f => f.endsWith(".html") && f !== "index.html");
let rebuilt = 0, skipped = 0;

for (const file of files) {
  const full = path.join(REPO, file);
  const html = readFileSync(full, "utf8");
  const match = html.match(DATA_RE);
  if (!match) { console.log(`[skip]     ${file} (no data block)`); skipped++; continue; }

  let data;
  try { data = JSON.parse(match[1]); }
  catch (e) { console.log(`[skip]     ${file} (bad JSON: ${e.message})`); skipped++; continue; }

  data.clean = true;

  const injected = TEMPLATE.replace(
    /<!-- DATA:START -->[\s\S]*?<!-- DATA:END -->/,
    `<!-- DATA:START -->\n<script id="contact-sheet-data" type="application/json">\n${
      JSON.stringify(data).replace(/<\//g, "<\\/")
    }\n</script>\n<!-- DATA:END -->`
  );
  writeFileSync(full, injected);
  console.log(`[rebuilt]  ${file}`);
  rebuilt++;
}

console.log(`\n${rebuilt} rebuilt, ${skipped} skipped.`);
