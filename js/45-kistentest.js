/* Kistentest: die Kistenoeffnung im Stil von Clash Royale, nur zum Ansehen.
   ------------------------------------------------------------------
   Aus dem Gespraech: "im Hauptmenue einen Kistentest-Button einfuegen, der
   nur die Animation zeigt aber keine Rewards gibt". Wann es Kisten im
   Spiel gibt, ist noch nicht entschieden - deshalb fasst diese Datei
   keinen Spielstand an. Die drei Karten zeigen zufaellige Wuerfeldesigns
   aus DICE_DESIGNS, schalten aber nichts frei.

   Die Bilder kommen nach docs/KISTEN-BRIEF.md unter
   assets/ui/v28/png/chests/<stufe>/. Solange eine Datei fehlt, zeigt die
   Ebene ihren Messrahmen (CSS, data-fehlt) und die Flaeche listet die
   fehlenden Dateien auf. So ist der Knopf zugleich die Abnahme fuer die
   Lieferung: erst wenn die Liste leer ist, ist der Satz vollstaendig.

   Ablauf (data-phase am Overlay):
     aus > ankunft > warten > [Tipp] > wackeln > aufspringen > enthuellung > fertig
   Kiste und Deckel laufen ueber CSS-Keyframes, Staub, Blitz und Funken
   auf einer eigenen Canvas in der Buehne. */
(() => {
  "use strict";
  const STUFEN=["common","rare","epic","legendary"];
  const STUFEN_NAMEN={common:"Gewöhnlich",rare:"Selten",epic:"Episch",legendary:"Legendär"};
  const STUFEN_FARBEN={common:"#e8d9b0",rare:"#4a8ff0",epic:"#b06cff",legendary:"#ffd45a"};
  const WURZEL="assets/ui/v28/png/chests/";
  const KARTEN=3;
  const tr=value=>window.t?window.t(String(value)):String(value);
  const rev=()=>typeof ASSET_REV!=="undefined"?ASSET_REV:"0";
  const bild=pfad=>`${WURZEL}${pfad}?v=${rev()}`;
  const stufenBild=(stufe,teil)=>bild(`${stufe}/chest-${stufe}-${teil}.webp`);
  const reduziert=()=>!!window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;

  const knopf=document.getElementById("menuKistenTestBtn");
  if(!knopf) return;

  let overlay=null,fx=null,stufe="common",lauf=0;
  const fehlend=new Set();

  function el(tag,klasse,text){const n=document.createElement(tag);if(klasse)n.className=klasse;if(text!=null)n.textContent=text;return n;}

  // Eine Bildebene: <div class="kisten-ebene" data-teil><img></div>. Faellt
  // das Bild aus, merkt sich die Ebene das (data-fehlt) und die Datei landet
  // in der Fehlliste. Laedt es spaeter doch, geht beides wieder weg.
  function ebene(klasse,teil){
    const wrap=el("div",`kisten-ebene ${klasse}`);wrap.dataset.teil=teil;
    const img=el("img");img.alt="";img.setAttribute("aria-hidden","true");img.draggable=false;img.decoding="async";
    img.onerror=()=>{wrap.dataset.fehlt="1";fehlend.add(img.dataset.pfad||"");zeigeFehlend();};
    img.onload=()=>{delete wrap.dataset.fehlt;fehlend.delete(img.dataset.pfad||"");zeigeFehlend();};
    wrap.appendChild(img);
    return wrap;
  }
  function setzeBild(wrap,src){
    const img=wrap.querySelector("img");
    const pfad=src.replace(/\?v=.*$/,"");
    if(img.dataset.pfad===pfad) return;
    fehlend.delete(img.dataset.pfad||"");
    img.dataset.pfad=pfad;delete wrap.dataset.fehlt;
    img.src=src;
  }

  function zeigeFehlend(){
    if(!overlay) return;
    const box=overlay.querySelector(".kisten-fehlend");
    const liste=[...fehlend].filter(Boolean).sort();
    box.innerHTML="";
    if(!liste.length){box.classList.add("hidden");return;}
    box.classList.remove("hidden");
    box.appendChild(el("strong",null,`${tr("Fehlende Bilddateien")}: ${liste.length}`));
    box.appendChild(el("span",null,` · ${tr("Bis sie da sind, laufen Messrahmen mit der Geometrie aus dem Kisten-Brief.")}`));
    const ul=el("ul");liste.forEach(p=>ul.appendChild(el("li",null,p.replace(WURZEL,"chests/"))));
    box.appendChild(ul);
  }

  function baue(){
    overlay=el("div","kisten-overlay hidden");overlay.id="kistenTestOverlay";
    overlay.dataset.phase="aus";overlay.dataset.stufe=stufe;
    overlay.setAttribute("role","dialog");overlay.setAttribute("aria-modal","true");

    const kopf=el("div","kisten-kopf");
    kopf.appendChild(el("div","kisten-kicker",tr("Kistentest")));
    const schliessen=el("button","kisten-schliessen",tr("Schließen"));schliessen.type="button";
    schliessen.onclick=schliesse;
    kopf.appendChild(schliessen);
    kopf.appendChild(el("div","kisten-untertitel",tr("Nur die Animation. Es wird nichts freigeschaltet und nichts gespeichert.")));
    const stufen=el("div","kisten-stufen");
    STUFEN.forEach(s=>{
      const b=el("button",s===stufe?"aktiv":"",tr(STUFEN_NAMEN[s]));b.type="button";b.dataset.stufe=s;
      b.onclick=()=>{waehleStufe(s);starte();};
      stufen.appendChild(b);
    });
    kopf.appendChild(stufen);
    overlay.appendChild(kopf);
    // Die Fehlliste steht oben unter dem Kopf und hat eine feste Hoehe:
    // unten wuerde sie auf dem Desktop in die Kartenreihe wachsen.
    overlay.appendChild(el("div","kisten-fehlend hidden"));

    const buehne=el("div","kisten-buehne");
    fx=el("canvas","kisten-fx");fx.setAttribute("aria-hidden","true");
    buehne.appendChild(fx);
    const kiste=el("div","kisten-kiste");
    kiste.appendChild(ebene("kisten-schatten","shadow"));
    kiste.appendChild(ebene("kisten-strahlen","rays"));
    const raum=el("div","kisten-raum");
    raum.appendChild(ebene("kisten-body","body"));
    raum.appendChild(ebene("kisten-licht","light"));
    const deckel=el("div","kisten-deckel");
    deckel.appendChild(ebene("kisten-lid","lid"));
    deckel.appendChild(ebene("kisten-lid-inner","lid-inner"));
    raum.appendChild(deckel);
    kiste.appendChild(raum);
    buehne.appendChild(kiste);
    buehne.appendChild(el("div","kisten-hinweis",tr("Tippen zum Öffnen")));
    buehne.onclick=()=>{if(overlay.dataset.phase==="warten")oeffne();};
    overlay.appendChild(buehne);

    overlay.appendChild(el("div","kisten-karten"));

    const fuss=el("div","kisten-fuss");
    const nochmal=el("button","kisten-nochmal",tr("Nochmal"));nochmal.type="button";
    nochmal.onclick=starte;
    fuss.appendChild(nochmal);
    overlay.appendChild(fuss);
    document.body.appendChild(overlay);
    ladeStufe();
  }

  function waehleStufe(s){
    stufe=s;
    overlay.dataset.stufe=s;
    overlay.querySelectorAll(".kisten-stufen button").forEach(b=>b.classList.toggle("aktiv",b.dataset.stufe===s));
    ladeStufe();
  }
  function ladeStufe(){
    const teil=(klasse,name)=>setzeBild(overlay.querySelector(`.kisten-kiste .${klasse}`),stufenBild(stufe,name));
    teil("kisten-body","body");teil("kisten-lid","lid");teil("kisten-lid-inner","lid-inner");
    teil("kisten-licht","light");teil("kisten-strahlen","rays");
    setzeBild(overlay.querySelector(".kisten-kiste .kisten-schatten"),bild("shared/chest-shadow.webp"));
  }

  // Drei zufaellige Wuerfeldesigns mit Vorschaubild - nur zum Zeigen.
  function zufallsDesigns(){
    const alle=typeof DICE_DESIGNS==="object"&&DICE_DESIGNS?Object.entries(DICE_DESIGNS).filter(([,d])=>d&&d.previewAsset):[];
    for(let i=alle.length-1;i>0;i--){const j=Math.floor(Math.random()*(i+1));[alle[i],alle[j]]=[alle[j],alle[i]];}
    return alle.slice(0,KARTEN).map(([key,d])=>({key,name:d.name||key,bild:`${d.previewAsset}?v=${rev()}`}));
  }
  function baueKarten(){
    const reihe=overlay.querySelector(".kisten-karten");
    reihe.innerHTML="";
    return zufallsDesigns().map((design,i)=>{
      const karte=el("div","kisten-karte");
      karte.style.setProperty("--kisten-karte-dx",`${(i-(KARTEN-1)/2)*-90}%`);
      karte.style.setProperty("--kisten-karte-drehung",`${(i-(KARTEN-1)/2)*18}deg`);
      const innen=el("div","kisten-karte-innen");
      const rueck=el("div","kisten-karte-rueck");
      const rueckEbene=ebene("kisten-karte-rueck-bild","card-back");setzeBild(rueckEbene,bild("shared/chest-card-back.webp"));
      rueck.appendChild(rueckEbene);
      const vorn=el("div","kisten-karte-vorn");
      const vornEbene=ebene("kisten-karte-vorn-bild","card-front");setzeBild(vornEbene,bild(`${stufe}/chest-card-front-${stufe}.webp`));
      vorn.appendChild(vornEbene);
      const designBild=el("img","kisten-karte-design");designBild.src=design.bild;designBild.alt="";designBild.draggable=false;
      vorn.appendChild(designBild);
      vorn.appendChild(el("div","kisten-karte-name",design.name));
      innen.appendChild(rueck);innen.appendChild(vorn);
      karte.appendChild(innen);
      reihe.appendChild(karte);
      return karte;
    });
  }

  /* ---------- Partikel auf der Canvas: Staub, Blitz, Funken ---------- */
  const teilchen=[];let blitz=0,fxLaeuft=false,fxLetzte=0;
  // Der Funke aus dem Satz (chest-sparkle.webp). Solange er nicht geladen
  // ist, zeichnet die Canvas eine Raute in derselben Groesse.
  const funkenBild=new Image();funkenBild.decoding="async";
  function ladeFunken(){if(!funkenBild.getAttribute("src"))funkenBild.src=bild("shared/chest-sparkle.webp");}
  function fxMass(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const r=fx.getBoundingClientRect();
    const w=Math.max(1,Math.round(r.width*dpr)),h=Math.max(1,Math.round(r.height*dpr));
    if(fx.width!==w||fx.height!==h){fx.width=w;fx.height=h;}
    return {ctx:fx.getContext("2d"),w,h,dpr};
  }
  // Mittelpunkt der Kiste im Canvas-Raster: die Canvas ragt ueber die
  // Buehne hinaus, deshalb aus dem Buehnenrechteck rechnen.
  function kistenPunkt(xAnteil,yAnteil){
    const b=overlay.querySelector(".kisten-buehne").getBoundingClientRect();
    const c=fx.getBoundingClientRect();
    const dpr=Math.min(2,window.devicePixelRatio||1);
    return {x:(b.left-c.left+b.width*xAnteil)*dpr,y:(b.top-c.top+b.height*yAnteil)*dpr,s:b.width*dpr};
  }
  function staub(){
    const p=kistenPunkt(.5,.9);
    for(let i=0;i<26;i++){
      const seite=i%2?1:-1,tempo=(.35+Math.random()*.9)*p.s*.004;
      teilchen.push({x:p.x+seite*p.s*(.2+Math.random()*.2),y:p.y,vx:seite*tempo*(1+Math.random()),vy:-tempo*(.2+Math.random()*.6),
        r:p.s*(.008+Math.random()*.014),leben:1,abbau:1.5+Math.random()*1.2,farbe:"210,190,150",art:"staub"});
    }
    fxStart();
  }
  function funken(){
    const p=kistenPunkt(.5,.44);
    const farbe=STUFEN_FARBEN[stufe]||"#ffd45a";
    const rgb=farbe.match(/[0-9a-f]{2}/gi).map(h=>parseInt(h,16)).join(",");
    for(let i=0;i<70;i++){
      const winkel=-Math.PI/2+(Math.random()-.5)*1.6,kraft=(.6+Math.random())*p.s*.012;
      teilchen.push({x:p.x+(Math.random()-.5)*p.s*.3,y:p.y,vx:Math.cos(winkel)*kraft,vy:Math.sin(winkel)*kraft,
        r:p.s*(.006+Math.random()*.012),leben:1,abbau:.55+Math.random()*.7,farbe:Math.random()<.5?rgb:"255,244,191",art:"funke",dreh:Math.random()*Math.PI,
        // Schwerkraft je Frame, an die Buehnengroesse gebunden: die Funken
        // steigen erst und fallen dann in einem Bogen, statt sofort zu kippen.
        g:p.s*.00045});
    }
    blitz=1;
    fxStart();
  }
  function fxStart(){if(fxLaeuft)return;fxLaeuft=true;fxLetzte=performance.now();requestAnimationFrame(fxFrame);}
  function fxFrame(jetzt){
    if(!overlay||overlay.classList.contains("hidden")){fxLaeuft=false;teilchen.length=0;blitz=0;return;}
    const dt=Math.min(.05,(jetzt-fxLetzte)/1000);fxLetzte=jetzt;
    const {ctx,w,h}=fxMass();
    ctx.clearRect(0,0,w,h);
    if(blitz>0){
      const p=kistenPunkt(.5,.44);
      const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,p.s*.9);
      g.addColorStop(0,`rgba(255,250,230,${.9*blitz})`);g.addColorStop(.35,`rgba(255,240,200,${.45*blitz})`);g.addColorStop(1,"rgba(255,240,200,0)");
      ctx.fillStyle=g;ctx.fillRect(0,0,w,h);
      blitz=Math.max(0,blitz-dt*3.2);
    }
    const frames=dt*60;
    for(let i=teilchen.length-1;i>=0;i--){
      const t=teilchen[i];
      t.leben-=dt*t.abbau;
      if(t.leben<=0){teilchen.splice(i,1);continue;}
      t.x+=t.vx*frames;t.y+=t.vy*frames;
      if(t.art==="funke"){t.vy+=t.g*frames;t.vx*=.985;t.dreh+=dt*6;}
      else{t.vx*=.94;t.vy*=.94;t.r*=1.01;}
      ctx.globalAlpha=Math.max(0,Math.min(1,t.art==="staub"?t.leben*.35:t.leben));
      ctx.fillStyle=`rgb(${t.farbe})`;
      if(t.art==="funke"){
        ctx.save();ctx.translate(t.x,t.y);ctx.rotate(t.dreh);
        if(funkenBild.complete&&funkenBild.naturalWidth){const g=t.r*4.4;ctx.drawImage(funkenBild,-g/2,-g/2,g,g);}
        else{ctx.beginPath();ctx.moveTo(0,-t.r*2.2);ctx.lineTo(t.r*.6,0);ctx.lineTo(0,t.r*2.2);ctx.lineTo(-t.r*.6,0);ctx.closePath();ctx.fill();}
        ctx.restore();
      }else{
        ctx.beginPath();ctx.arc(t.x,t.y,t.r,0,Math.PI*2);ctx.fill();
      }
    }
    ctx.globalAlpha=1;
    if(teilchen.length||blitz>0)requestAnimationFrame(fxFrame);
    else{fxLaeuft=false;ctx.clearRect(0,0,w,h);}
  }

  /* ---------- Ablauf ---------- */
  function tempo(){return reduziert()?.15:1;}
  function phase(name){overlay.dataset.phase=name;}
  function spaeter(ms,fn,meinLauf){setTimeout(()=>{if(lauf===meinLauf&&overlay&&!overlay.classList.contains("hidden"))fn();},Math.round(ms*tempo()));}

  // Erst wenn die Bilder der Kiste dekodiert sind, faellt sie herein. Beim
  // allerersten Lauf kam der Koerper sonst erst nach dem Deckel ins Bild -
  // die Kiste stand einen Moment ohne Unterteil da. Fehlende Dateien halten
  // nichts auf: decode() lehnt ab, und nach spaetestens 2,5 s geht es los.
  function bilderBereit(){
    const imgs=[...overlay.querySelectorAll(".kisten-kiste img")].filter(i=>i.getAttribute("src"));
    const alle=Promise.all(imgs.map(i=>i.decode().catch(()=>{})));
    return Promise.race([alle,new Promise(r=>setTimeout(r,2500))]);
  }

  function starte(){
    const meinLauf=++lauf;
    overlay.style.setProperty("--kt",String(tempo()));
    overlay.querySelector(".kisten-karten").innerHTML="";
    teilchen.length=0;blitz=0;
    // Deckel-Keyframes muessen neu anlaufen: Phase erst auf "aus", dann
    // im naechsten Frame auf "ankunft", sonst bleibt der Deckel offen.
    phase("aus");
    bilderBereit().then(()=>requestAnimationFrame(()=>{
      if(lauf!==meinLauf||overlay.classList.contains("hidden"))return;
      phase("ankunft");
      spaeter(500,staub,meinLauf);
      spaeter(900,()=>phase("warten"),meinLauf);
    }));
  }
  function oeffne(){
    const meinLauf=lauf;
    phase("wackeln");
    spaeter(1400,()=>{
      phase("aufspringen");
      spaeter(110,funken,meinLauf);
      spaeter(650,()=>enthuelle(meinLauf),meinLauf);
    },meinLauf);
  }
  function enthuelle(meinLauf){
    phase("enthuellung");
    const karten=baueKarten();
    const abstand=380,flug=520,drehung=640;
    karten.forEach((karte,i)=>{
      spaeter(i*abstand,()=>{karte.classList.add("fliegt");},meinLauf);
      spaeter(i*abstand+flug,()=>{karte.classList.remove("fliegt");karte.classList.add("gelandet");},meinLauf);
      spaeter(i*abstand+flug+140,()=>{karte.classList.add("gedreht");},meinLauf);
    });
    spaeter((karten.length-1)*abstand+flug+140+drehung+100,()=>phase("fertig"),meinLauf);
    if(!karten.length)spaeter(300,()=>phase("fertig"),meinLauf);
  }

  function oeffneFlaeche(){
    if(!overlay)baue();
    ladeFunken();
    overlay.classList.remove("hidden");
    zeigeFehlend();
    starte();
  }
  function schliesse(){
    lauf++;
    overlay.classList.add("hidden");
    phase("aus");
    overlay.querySelector(".kisten-karten").innerHTML="";
    teilchen.length=0;blitz=0;
  }

  knopf.addEventListener("click",oeffneFlaeche);
  document.addEventListener("keydown",e=>{if(e.key==="Escape"&&overlay&&!overlay.classList.contains("hidden"))schliesse();});

  window.WDKistentest=Object.freeze({open:oeffneFlaeche,close:schliesse,stufen:[...STUFEN]});
})();
