/* Wuerfeldesign-Lieferung einpassen: 1024er verlustfreie WebP (oder PNG)
   -> 512er verlustbehaftete WebP mit Alpha, Qualitaet 88, wie in
   docs/WUERFELDESIGN-BRIEF.md. Ohne Bildbibliothek: Chromium zeichnet auf
   eine Canvas und kodiert selbst.

   Aufruf: node scripts/wuerfel-webp-konvertieren.mjs <Quellordner> [Zielordner]
   Quellordner enthaelt je Design einen Unterordner mit den acht Dateien;
   Ziel ist standardmaessig assets/ui/v28/png/dice-designs. Die Geometrie
   wird NICHT veraendert - sie muss schon in der Lieferung stimmen
   (scripts/qa/wuerfeldesigns.mjs misst das Raster danach). */
import fs from 'node:fs';import path from 'node:path';
const {chromium}=await import('/opt/node22/lib/node_modules/playwright/index.mjs');
const [quelle,ziel="assets/ui/v28/png/dice-designs"]=process.argv.slice(2);
const browser=await chromium.launch({executablePath:'/opt/pw-browsers/chromium',args:['--no-sandbox']});
const p=await browser.newPage();
for(const design of fs.readdirSync(quelle).filter(d=>fs.statSync(path.join(quelle,d)).isDirectory())){
  fs.mkdirSync(path.join(ziel,design),{recursive:true});
  for(const f of fs.readdirSync(path.join(quelle,design)).filter(f=>/\.(webp|png)$/.test(f))){
    const data=fs.readFileSync(path.join(quelle,design,f)).toString('base64');
    const out=await p.evaluate(async(b64)=>{
      const img=new Image();img.src='data:image/${f.endsWith('.png')?'png':'webp'};base64,'+b64;await img.decode();
      const c=document.createElement('canvas');c.width=512;c.height=512;const ctx=c.getContext('2d');
      ctx.imageSmoothingEnabled=true;ctx.imageSmoothingQuality='high';ctx.drawImage(img,0,0,512,512);
      return c.toDataURL('image/webp',0.88).split(',')[1];
    },data);
    fs.writeFileSync(path.join(ziel,design,f.replace(/\.png$/,'.webp')),Buffer.from(out,'base64'));
    console.log(design,f,fs.statSync(path.join(ziel,design,f.replace(/\.png$/,'.webp'))).size);
  }
}
await browser.close();
