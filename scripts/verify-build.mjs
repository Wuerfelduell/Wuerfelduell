import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

async function exists(relativePath) {
  return stat(path.join(root, relativePath)).then(() => true).catch(() => false);
}

const [html, versionText, packageText, configText, workerText, css, worldThemeText] = await Promise.all([
  readFile(path.join(root, "index.html"), "utf8"),
  readFile(path.join(root, "version.json"), "utf8"),
  readFile(path.join(root, "package.json"), "utf8"),
  readFile(path.join(root, "js", "01-config.js"), "utf8"),
  readFile(path.join(root, "sw.js"), "utf8"),
  readFile(path.join(root, "css", "app.css"), "utf8"),
  readFile(path.join(root, "js", "39-campaign-world-themes.js"), "utf8")
]);
const versionData = JSON.parse(versionText);
const packageData = JSON.parse(packageText);
const version = String(versionData.version ?? "").replace(/^V/i, "");

if (!version) errors.push("version.json has no version");
if (packageData.version !== version) errors.push(`package.json (${packageData.version}) differs from version.json (${version})`);
if (!new RegExp(`GAME_VERSION\\s*=\\s*["']${version.replaceAll(".","\\.")}["']`).test(configText)) errors.push("GAME_VERSION differs from version.json");
if (!new RegExp(`CACHE_VERSION\\s*=\\s*["']${version.replaceAll(".","\\.")}["']`).test(workerText)) errors.push("CACHE_VERSION differs from version.json");
if (!html.includes(`name="wd-build" content="${version}"`)) errors.push("wd-build meta version differs from version.json");
if (!html.includes(`DiceDuel · V${version}`)) errors.push("document title version differs from version.json");
if (!html.includes(`css/app.css?v=${version}`)) errors.push("CSS bundle query version differs from version.json");

for (const match of html.matchAll(/(?:src|href)="([^"#?]+)\?v=([^"&#]+)[^"]*"/g)) {
  const [,ref,queryVersion]=match;
  if (/^(?:js|lang|css)\//.test(ref)&&queryVersion!==version) errors.push(`asset query version differs: ${ref}?v=${queryVersion}`);
}
// Ältere Asset-Revisionsnummern (z. B. 28.2.x bei einzelnen Bildern) sind
// keine App-Version. Nur die bekannten Mischbuild-Linien 28.7/28.8 sind hier
// release-blockierend; das CSS-Bundle selbst muss exakt die App-Version tragen.
for (const match of css.matchAll(/url\([^)]*\?v=((?:28\.7|28\.8)\.[0-9]+)/g)) errors.push(`stale V28.7/V28.8 CSS asset query: ${match[1]}`);

const localRefs = [...html.matchAll(/(?:src|href)="([^"#?]+)(?:[?#][^"]*)?"/g)]
  .map((match) => match[1])
  .filter((ref) => !/^(?:https?:|data:|mailto:|tel:)/.test(ref));

for (const ref of new Set(localRefs)) {
  if (!(await exists(ref))) errors.push(`index.html references missing file: ${ref}`);
}

for (const match of css.matchAll(/url\(\s*["']?([^"')?#]+)(?:[?#][^"')]*)?["']?\s*\)/g)) {
  const ref = match[1].trim();
  if (/^(?:data:|https?:|#)/.test(ref)) continue;
  const resolved = path.relative(root, path.resolve(root, "css", ref));
  if (!(await exists(resolved))) errors.push(`css/app.css references missing file: ${ref}`);
}

// World image URLs are stored in JS custom properties but consumed by
// declarations in css/app.css. Browsers therefore resolve them relative to
// /css, not relative to index.html or the JS file.
const worldRootMatch = worldThemeText.match(/const ASSET_ROOT\s*=\s*["']([^"']+)["']/);
if (!worldRootMatch) {
  errors.push("campaign world ASSET_ROOT is missing");
} else {
  const worldRoot = path.resolve(root, "css", worldRootMatch[1]);
  const worldStems = new Set(
    [...worldThemeText.matchAll(/["'](world-(?:solo|duo|trio)-[^"']+)\.png["']/g)]
      .map((match) => match[1])
  );
  const fittedFrameStems = new Set(
    [...worldThemeText.matchAll(/["'](world-(?:solo|duo|trio)-[^"']+)["']\s*:\s*["'](?:\d+(?:\.\d+)?%\s+){3}\d+(?:\.\d+)?%["']/g)]
      .map((match) => match[1])
  );
  if (!worldStems.size) errors.push("campaign world theme list is empty");
  for (const stem of worldStems) {
    if (!fittedFrameStems.has(stem)) errors.push(`campaign world frame has no fitted inner opening: ${stem}`);
    for (const suffix of [".webp", "-frame.webp", "-frame-rect.webp"]) {
      const file = path.join(worldRoot, `${stem}${suffix}`);
      if (!(await stat(file).then(() => true).catch(() => false))) {
        errors.push(`campaign world asset does not resolve from css/app.css: ${path.relative(root, file)}`);
      }
    }
  }
}

const jsFiles = (await readdir(path.join(root, "js")))
  .filter((file) => file.endsWith(".js"))
  .sort();

for (const file of jsFiles) {
  const result = spawnSync(process.execPath, ["--check", path.join(root, "js", file)], { encoding: "utf8" });
  if (result.status !== 0) errors.push(`JavaScript syntax error in js/${file}: ${result.stderr.trim()}`);
}

if (errors.length) {
  console.error(errors.map((error) => `- ${error}`).join("\n"));
  process.exitCode = 1;
} else {
  console.log(`Build verified: version ${version}, ${localRefs.length} HTML references, ${jsFiles.length} JavaScript files.`);
}
