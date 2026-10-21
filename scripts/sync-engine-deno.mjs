// Die Browser-Engine bleibt die einzige Quelle; Edge Functions erhalten Kopien.
import {mkdir, readFile, writeFile} from 'node:fs/promises';

const files = ['01-rng.js', '02-definitions.js', '03-state.js', '04-rules.js', '05-reduce.js'];
const args = process.argv.slice(2);
if (args.length > 1 || (args.length === 1 && args[0] !== '--check')) {
  console.error('Aufruf: node scripts/sync-engine-deno.mjs [--check]');
  process.exit(1);
}
const check = args[0] === '--check';
const source = new URL('../js/engine/', import.meta.url);
const target = new URL('../supabase/functions/_shared/engine/', import.meta.url);

try {
  const copies = [];
  for (const name of files) {
    const header = Buffer.from(`// Erzeugt aus js/engine/${name} durch scripts/sync-engine-deno.mjs. Nicht von Hand ändern.\n`);
    const original = await readFile(new URL(name, source));
    copies.push({name, expected: Buffer.concat([header, original])});
  }
  if (!check) await mkdir(target, {recursive: true});
  let written = 0;
  for (const {name, expected} of copies) {
    const file = new URL(name, target);
    let actual;
    try {actual = await readFile(file);}
    catch (error) {if (error.code !== 'ENOENT') throw error;}
    if (actual?.equals(expected)) continue;
    if (check) {
      const reason = actual ? 'weicht vom Original samt Kopfkommentar ab' : 'fehlt';
      throw new Error(`supabase/functions/_shared/engine/${name} ${reason}. ` +
        'Mit node scripts/sync-engine-deno.mjs neu erzeugen.');
    }
    await writeFile(file, expected); written++;
  }
  console.log(check ? 'Deno-Engine: alle fünf Kopien samt Kopfkommentar bytegleich.' :
    `Deno-Engine: ${written} von fünf Kopien neu erzeugt.`);
} catch (error) {
  console.error('Engine-Synchronisierung fehlgeschlagen: ' + error.message);
  process.exitCode = 1;
}
