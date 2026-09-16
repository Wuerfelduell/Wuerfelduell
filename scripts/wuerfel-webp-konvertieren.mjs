/* Wuerfeldesign-Lieferung einpassen: 1024er verlustfreie WebP (oder PNG)
   -> 512er verlustbehaftete WebP mit Alpha, Qualitaet 88, wie in
   docs/WUERFELDESIGN-BRIEF.md. Ohne Bildbibliothek: Chromium zeichnet auf
   eine Canvas und kodiert selbst.

   Aufruf: node scripts/wuerfel-webp-konvertieren.mjs <Quellordner> [Zielordner]
   Der Quellordner enthaelt je Design einen Unterordner mit den acht
   Dateien; Ziel ist standardmaessig assets/ui/v28/png/dice-designs. Die
   Geometrie wird NICHT veraendert - sie muss schon in der Lieferung
   stimmen (scripts/qa/wuerfeldesigns.mjs misst das Raster danach). */
import fs from "node:fs";
import path from "node:path";
const {chromium}=await import(process.env.WD_PLAYWRIGHT||"/opt/node22/lib/node_modules/playwright/index.mjs");

const [quelle,ziel="assets/ui/v28/png/dice-designs"]=process.argv.slice(2);
if(!quelle||!fs.existsSync(quelle)){
  console.error("Aufruf: node scripts/wuerfel-webp-konvertieren.mjs <Quellordner> [Zielordner]");
  process.exit(1);
}
const browser=await chromium.launch({executablePath:process.env.WD_CHROMIUM||"/opt/pw-browsers/chromium",args:["--no-sandbox"]});
const seite=await browser.newPage();
let anzahl=0;
for(const design of fs.readdirSync(quelle).filter(d=>fs.statSync(path.join(quelle,d)).isDirectory())){
  fs.mkdirSync(path.join(ziel,design),{recursive:true});
  for(const datei of fs.readdirSync(path.join(quelle,design)).filter(f=>/\.(webp|png)$/i.test(f))){
    const mime=/\.png$/i.test(datei)?"image/png":"image/webp";
    const daten=fs.readFileSync(path.join(quelle,design,datei)).toString("base64");
    const ergebnis=await seite.evaluate(async({b64,mime})=>{
      const img=new Image();img.src=`data:${mime};base64,${b64}`;await img.decode();
      const c=document.createElement("canvas");c.width=512;c.height=512;
      const ctx=c.getContext("2d");ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality="high";
      ctx.drawImage(img,0,0,512,512);
      return c.toDataURL("image/webp",0.88).split(",")[1];
    },{b64:daten,mime});
    const zielDatei=path.join(ziel,design,datei.replace(/\.png$/i,".webp"));
    fs.writeFileSync(zielDatei,Buffer.from(ergebnis,"base64"));
    anzahl++;
    console.log(`${design}/${path.basename(zielDatei)}  ${fs.statSync(zielDatei).size} Bytes`);
  }
}
await browser.close();
console.log(`${anzahl} Dateien geschrieben nach ${ziel}.`);
