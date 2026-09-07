import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import path from "node:path";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDir = path.join(root, "src", "styles", "legacy");
const outputFile = path.join(root, "css", "app.css");

// This order intentionally mirrors the former <link> order in index.html.
// Changing it can alter the cascade and therefore requires visual regression testing.
export const styleOrder = [
  "01-grundlage.css",
  "06-version-27.css",
  "09-labore.css",
  "11-mastery-und-konto.css",
  "13-v28-grundlage.css",
  "16-v28-phasen.css",
  "29-v28-korrekturen.css",
  "32-nachtraege.css",
  "36-v28-hierarchie.css",
  "37-abschluss.css"
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
