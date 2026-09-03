import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "src", "styles", "legacy");
const outputFile = path.join(root, "css", "app.css");

// This order intentionally mirrors the former <link> order in index.html.
// Changing it can alter the cascade and therefore requires visual regression testing.
export const styleOrder = [
  "01-base-ui.css",
  "02-battle.css",
  "03-campaign.css",
  "04-prestige-polish.css",
  "05-online.css",
  "06-v275.css",
  "07-v2751.css",
  "08-v276.css",
  "09-test-lab.css",
  "10-dice-tray-lab.css",
  "11-mastery.css",
  "12-cloud-account.css",
  "12-ability-mastery-lab.css",
  "13-v28-grundlage.css",
  "16-v28-phasen.css",
  "29-v28-korrekturen.css",
  "32-emoji-sprite-pass.css",
  "33-duo-boss-rush.css",
  "35-v28-frame-catchup.css",
  "36-v28-hierarchie.css",
  "37-v28-feinschliff.css",
  "38-endgame-mechanics.css",
  "39-v28-campaign-polish.css",
  "40-v28-screen-restoration.css",
  "41-v28-world-asset-pack.css"
];

async function createBundle() {
  const chunks = await Promise.all(styleOrder.map(async (file) => {
    const css = await readFile(path.join(sourceDir, file), "utf8");
    return `/* ===== ${file} ===== */\n${css.trimEnd()}\n`;
  }));

  return [
    "/* GENERATED FILE — edit src/styles/legacy and run npm run build:styles. */",
    "/* Source order is part of the visual contract. */",
    "",
    ...chunks
  ].join("\n");
}

const expected = await createBundle();

if (process.argv.includes("--check")) {
  const actual = await readFile(outputFile, "utf8").catch(() => "");
  if (actual !== expected) {
    console.error("css/app.css is outdated. Run: npm run build:styles");
    process.exitCode = 1;
  } else {
    console.log(`CSS bundle is current (${styleOrder.length} sources).`);
  }
} else {
  await writeFile(outputFile, expected, "utf8");
  console.log(`Built css/app.css from ${styleOrder.length} sources.`);
}
