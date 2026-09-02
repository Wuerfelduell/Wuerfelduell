import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

async function exists(relativePath) {
  return stat(path.join(root, relativePath)).then(() => true).catch(() => false);
}

const [html, versionText, css] = await Promise.all([
  readFile(path.join(root, "index.html"), "utf8"),
  readFile(path.join(root, "version.json"), "utf8"),
  readFile(path.join(root, "css", "app.css"), "utf8")
]);
const versionData = JSON.parse(versionText);
const version = String(versionData.version ?? "").replace(/^V/i, "");

if (!version) errors.push("version.json has no version");
if (!html.includes(`name="wd-build" content="${version}"`)) errors.push("wd-build meta version differs from version.json");
if (!html.includes(`DiceDuel · V${version}`)) errors.push("document title version differs from version.json");
if (!html.includes(`css/app.css?v=${version}`)) errors.push("CSS bundle query version differs from version.json");

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
