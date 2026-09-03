import { readdir, readFile, stat } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const errors = [];

async function exists(relativePath) {
  return stat(path.join(root, relativePath)).then(() => true).catch(() => false);
}

const [html, versionText, packageText, configText, workerText, css, worldThemeText, worldPackCssText, bossRushText, battleUiText] = await Promise.all([
  readFile(path.join(root, "index.html"), "utf8"),
  readFile(path.join(root, "version.json"), "utf8"),
  readFile(path.join(root, "package.json"), "utf8"),
  readFile(path.join(root, "js", "01-config.js"), "utf8"),
  readFile(path.join(root, "sw.js"), "utf8"),
  readFile(path.join(root, "css", "app.css"), "utf8"),
  readFile(path.join(root, "js", "39-campaign-world-themes.js"), "utf8"),
  readFile(path.join(root, "src", "styles", "legacy", "41-v28-world-asset-pack.css"), "utf8"),
  readFile(path.join(root, "js", "37-duo-boss-rush.js"), "utf8"),
  readFile(path.join(root, "js", "12-battle-ui.js"), "utf8")
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

// Changelog. Bis V28.7.3 wurde eine Version mit einem globalen sed über
// index.html hochgezogen; das benannte auch die Überschrift des neuesten
// Eintrags um, sodass derselbe Eintrag zweimal weiterwanderte und die
// Notizen zu 28.7.1 und 28.7.2 verschwanden. Seither zieht
// scripts/bump-version.mjs nur benannte Stellen hoch — diese Prüfung
// stellt sicher, dass es dabei bleibt.
const changelogVersions = [...html.matchAll(/class="changelog-version">V([\d.]+)</g)].map((m) => m[1]);
if (!changelogVersions.length) {
  errors.push("index.html has no changelog entries");
} else {
  if (changelogVersions[0] !== version) {
    errors.push(`newest changelog entry is V${changelogVersions[0]}, but version.json says ${version}`);
  }
  const teile = (v) => v.split(".").map(Number);
  const juenger = (a, b) => {
    const A = teile(a), B = teile(b);
    for (let i = 0; i < Math.max(A.length, B.length); i++) {
      const d = (A[i] || 0) - (B[i] || 0);
      if (d) return d;
    }
    return 0;
  };
  for (let i = 1; i < changelogVersions.length; i++) {
    if (juenger(changelogVersions[i - 1], changelogVersions[i]) < 0) {
      errors.push(`changelog is out of order: V${changelogVersions[i - 1]} listed above V${changelogVersions[i]}`);
    }
  }
  // Doppelte Etiketten nur ab V28 blockieren. Darunter liegen rund 40
  // Alteinträge aus der Zeit vor der Versionsdisziplin; sie sind
  // inhaltlich verschieden, lassen sich aber nicht mehr zuverlässig
  // einzelnen Releases zuordnen und werden deshalb nicht angefasst.
  const gesehen = new Map();
  for (const v of changelogVersions) {
    if (teile(v)[0] < 28) continue;
    gesehen.set(v, (gesehen.get(v) || 0) + 1);
  }
  for (const [v, anzahl] of gesehen) {
    if (anzahl > 1) errors.push(`changelog lists V${v} ${anzahl} times`);
  }
}

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
  const themeKeys = new Set(
    [...worldThemeText.matchAll(/["']((?:solo|duo|trio)-[^"']+)["']\s*:\s*theme\(/g)]
      .map((match) => match[1])
  );
  if (!worldStems.size) errors.push("campaign world theme list is empty");
  if (/FRAME_(?:FILL_)?INSETS|--world-frame-(?:fill-)?inset/.test(`${worldThemeText}\n${worldPackCssText}`)) {
    errors.push("obsolete per-world frame inset workaround is still present");
  }
  if (worldPackCssText.includes("border-image-source:var(--world-frame-rect")) {
    errors.push("painted 3:1 world frame must never be used as border-image");
  }
  if (!worldPackCssText.includes("background:var(--world-frame-rect,var(--p1-ivory-card)) center/100% 100% no-repeat")) {
    errors.push("wide campaign surfaces do not consume the complete world frame with a neutral fallback");
  }
  if (!worldPackCssText.includes("aspect-ratio:3 / 1")) errors.push("wide world artwork has no 3:1 preferred aspect ratio");
  if (!/\.campaign-world-btn::before\s*\{[\s\S]*?border-image-source:var\(--p1-ivory-card\)/.test(worldPackCssText)) {
    errors.push("all campaign world tabs do not share the tier-2 neutral frame");
  }
  const bannerDescription = worldPackCssText.match(/\.campaign-world-banner-desc\s*\{([\s\S]*?)\}/)?.[1] || "";
  if (!bannerDescription.includes("overflow:visible") || !bannerDescription.includes("-webkit-line-clamp:unset")) {
    errors.push("campaign world banner description can still be clipped");
  }
  if (!/\.campaign-node-detail\[data-p4-detail-tone="boss"\][\s\S]*?border-image-source:var\(--p1-ivory-card\)/.test(worldPackCssText)) {
    errors.push("tall campaign boss detail has no tier-2 neutral outer frame");
  }

  const sequenceBlock = bossRushText.match(/const BOSS_RUSH_WORLD_THEME_KEYS=Object\.freeze\(\[([\s\S]*?)\]\);/);
  const sequence = [...(sequenceBlock?.[1] || "").matchAll(/["']((?:solo|duo|trio)-[^"']+)["']/g)].map((match) => match[1]);
  if (sequence.length !== 10) errors.push(`Boss Rush world sequence has ${sequence.length} entries, expected 10`);
  sequence.forEach((key, index) => {
    if (!themeKeys.has(key)) errors.push(`Boss Rush references unknown world theme: ${key}`);
    if (index > 0 && sequence[index - 1] === key) errors.push(`Boss Rush repeats world theme on adjacent stages: ${key}`);
  });
  if (!bossRushText.includes("BOSS_RUSH_WORLD_THEME_KEYS[index%BOSS_RUSH_WORLD_THEME_KEYS.length]")) {
    errors.push("Boss Rush world theme is not derived deterministically from the stage index");
  }
  if (!/p\.campaignTeam===["']enemy["'][\s\S]*?boss-rush-world-enemy[\s\S]*?applyTheme/.test(battleUiText)) {
    errors.push("Boss Rush world theme is not scoped to rendered enemy cards");
  }
  if (!worldPackCssText.includes("#game.boss-rush-game #players .player.boss-rush-world-enemy")) {
    errors.push("Boss Rush enemy world-card styling is missing");
  }
  if (/body\.playing #game\.boss-rush-game #players \.player\s*\{/.test(worldPackCssText)) {
    errors.push("Boss Rush world-card styling also targets player cards");
  }
  for (const stem of worldStems) {
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
