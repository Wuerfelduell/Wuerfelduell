/* Shop: Reiter Kisten und Waehrung im bisherigen Trophy-Shop.
   ------------------------------------------------------------------
   Der Trophy-Shop (js/08-profiles-stats.js, renderPrestigeShop) bleibt
   unveraendert und wird zum Reiter "Trophaeen". Diese Datei haengt zwei
   Reiter daneben:
   - Kisten: vier Stufen, Preise in Duellmarken oder Wuerfelkernen, die
     Dropchancen VOR dem Kauf einsehbar, der Schutzzaehler sichtbar. Kauf
     bucht ab, zieht (js/46-shop-daten.js) und oeffnet die Kiste
     (js/45-kistentest.js) mit dem echten Ergebnis.
   - Waehrung: Guthaben und die Kern-Pakete als Vorschau. Der Kauf mit
     Echtgeld ist nicht angebunden - die Knoepfe sind bewusst ohne Wirkung.

   Die Bilder der Pakete, Waehrungen und Plaketten kommen spaeter
   (Asset-Auftrag V3). Bis dahin stehen die vorhandenen SVG-Icons. */
(() => {
  "use strict";
  const screen=document.getElementById("prestigeShopScreen");
  const S=window.WDShop;
  if(!screen||!S) return;
  const tr=value=>window.t?window.t(String(value)):String(value);
  const esc=s=>typeof escapeHtml==="function"?escapeHtml(String(s)):String(s);
  const icon=p=>typeof uiIcon==="function"?uiIcon(p):"";
  const artwork=(kind,expand)=>typeof window.WDButtonArtwork==="function"?window.WDButtonArtwork(kind,expand):"";
  const rev=()=>typeof ASSET_REV!=="undefined"?ASSET_REV:"0";
  const KISTENBILD=stufe=>`assets/ui/v28/png/chests/${stufe}/chest-${stufe}-closed.webp?v=${rev()}`;
  // Shop-Bilder aus Asset-Auftrag V3, Pakete A bis E: Waehrungen, Pakete,
  // Seltenheitsplaketten, Reiter-Embleme, Baender und Preisschild. Der
  // Hintergrund des Kistenmenues (Paket F) steht noch aus.
  const SHOPBILD=pfad=>`assets/ui/v28/png/shop/${pfad}?v=${rev()}`;
  const WAEHRUNG_ICON={marken:"currency/duellmarke-icon.webp",kerne:"currency/wuerfelkern-icon.webp"};
  const PLAKETTE=seltenheit=>SHOPBILD(`rarity/rarity-${String(seltenheit).replace("_","-")}.webp`);
  const bildTag=(src,klasse)=>`<img class="${klasse}" src="${src}" alt="" draggable="false" aria-hidden="true">`;
  const PAKETE=[
    {id:"kerne-1",name:"Eine Handvoll Kerne",menge:80},
    {id:"kerne-2",name:"Beutel voller Kerne",menge:250},
    {id:"kerne-3",name:"Schatulle voller Kerne",menge:600},
    {id:"kerne-4",name:"Truhe voller Kerne",menge:1500}
  ];

  let tab="chests";
  const chancenOffen=new Set();
  let hinweis="";

  const profilSelect=()=>document.getElementById("prestigeShopProfileSelect");
  function profil(){
    const id=profilSelect()?.value;
    if(typeof getProfile==="function"&&id) return getProfile(id);
    return null;
  }

  /* ---------- Aufbau ---------- */
  function baue(){
    if(screen.querySelector(".shop-tabs")) return;
    const head=screen.querySelector(".prestige-shop-head");
    const subtitle=screen.querySelector(".screen-subtitle");
    const equipped=document.getElementById("prestigeEquipped");
    const list=document.getElementById("prestigeShopList");
    if(!head||!equipped||!list) return;
    head.insertAdjacentHTML("beforeend",
      `<div class="prestige-wallet shop-wallet" data-waehrung="marken"><span>${tr("Duellmarken")}</span><strong id="shopWalletMarken">${bildTag(SHOPBILD(WAEHRUNG_ICON.marken),"shop-wallet-icon")}<b>0</b></strong></div>`+
      `<div class="prestige-wallet shop-wallet" data-waehrung="kerne"><span>${tr("Würfelkerne")}</span><strong id="shopWalletKerne">${bildTag(SHOPBILD(WAEHRUNG_ICON.kerne),"shop-wallet-icon")}<b>0</b></strong></div>`);
    const tabs=document.createElement("div");tabs.className="shop-tabs";tabs.setAttribute("role","tablist");
    [["chests","Kisten","tabs/tab-kisten.webp"],["trophies","Trophäen","tabs/tab-trophaeen.webp"],["currency","Währung","tabs/tab-waehrung.webp"]].forEach(([key,label,pfad])=>{
      const b=document.createElement("button");b.type="button";b.className="shop-tab-btn";b.dataset.shopTab=key;b.setAttribute("role","tab");
      b.innerHTML=`${bildTag(SHOPBILD(pfad),"shop-tab-emblem")}<span>${tr(label)}</span>`;
      b.onclick=()=>{tab=key;hinweis="";render();};
      tabs.appendChild(b);
    });
    head.after(tabs);
    const panel=(id)=>{const d=document.createElement("div");d.id=id;d.className="shop-tab-panel";return d;};
    const trophies=panel("shopTabTrophies"),chests=panel("shopTabChests"),currency=panel("shopTabCurrency");
    if(subtitle) trophies.appendChild(subtitle);
    trophies.appendChild(equipped);trophies.appendChild(list);
    tabs.after(trophies,chests,currency);
    profilSelect()?.addEventListener("change",render);
  }

  /* ---------- Darstellung ---------- */
  function render(){
    baue();
    const p=profil();
    const w=S.wallet(p);
    const marken=document.getElementById("shopWalletMarken"),kerne=document.getElementById("shopWalletKerne");
    if(marken) marken.querySelector("b").textContent=String(w.marken);
    if(kerne) kerne.querySelector("b").textContent=String(w.kerne);
    screen.querySelectorAll(".shop-tab-btn").forEach(b=>{const aktiv=b.dataset.shopTab===tab;b.classList.toggle("aktiv",aktiv);b.setAttribute("aria-selected",aktiv?"true":"false");});
    screen.querySelector("#shopTabTrophies").classList.toggle("hidden",tab!=="trophies");
    screen.querySelector("#shopTabChests").classList.toggle("hidden",tab!=="chests");
    screen.querySelector("#shopTabCurrency").classList.toggle("hidden",tab!=="currency");
    if(tab==="chests") renderKisten(p);
    if(tab==="currency") renderWaehrung(p);
    if(typeof layoutContainedScreen==="function") requestAnimationFrame(()=>layoutContainedScreen(screen));
  }

  function chancenTabelle(stufe,p){
    const c=S.chancen(stufe,p);
    const zeilen=S.SELTENHEITEN.map(s=>{
      const leer=!S.pool(s).length;
      const schutz=s==="epic"&&c.schutzBonus>0?` <em class="shop-chance-schutz">(+${c.schutzBonus} ${tr("Schutz")})</em>`:"";
      return `<tr data-seltenheit="${s}"${leer?' class="leer"':""}><th>${bildTag(PLAKETTE(s),"shop-seltenheit-plakette")}${esc(S.SELTENHEIT_NAMEN[s])}</th><td>${String(c[s]).replace(".",",")} %${schutz}</td><td class="shop-chance-pool">${leer?tr("noch keine Würfel"):`${S.pool(s).length} ${tr("Würfel")}`}</td></tr>`;
    }).join("");
    const leere=S.SELTENHEITEN.filter(s=>!S.pool(s).length);
    const rueckfall=leere.length?`<div class="shop-chancen-hinweis">${tr("Fällt der Wurf auf eine Stufe ohne Würfel, rutscht er eine Stufe tiefer.")}</div>`:"";
    return `<table class="shop-chancen-tabelle"><tbody>${zeilen}</tbody></table>${rueckfall}`;
  }

  function renderKisten(p){
    const box=screen.querySelector("#shopTabChests");
    if(!p){box.innerHTML=`<div class="shop-hinweis">${tr("Erstelle zuerst ein Profil.")}</div>`;return;}
    const w=S.wallet(p),k=S.kisten(p);
    const bonus=S.schutzBonus(p);
    const schutzText=bonus>0
      ?`${tr("Schutz aktiv")}: +${bonus} ${tr("Prozentpunkte auf Epic")} · ${k.ohneEpic} ${tr("Öffnungen ohne Epic")}`
      :`${tr("Schutz")}: ${k.ohneEpic} / ${S.SCHUTZ.ab} ${tr("Öffnungen ohne Epic")} · ${tr("ab")} ${S.SCHUTZ.ab} ${tr("steigt die Epic-Chance je Öffnung um")} ${S.SCHUTZ.schritt} ${tr("Prozentpunkte, höchstens")} +${S.SCHUTZ.max}. ${tr("Legendary bleibt fix.")}`;
    const karten=S.STUFEN.map(stufe=>{
      const kiste=S.KISTEN[stufe];
      const offen=chancenOffen.has(stufe);
      const knopf=(waehrung,preis,label)=>{
        if(preis==null) return "";
        const reicht=w[waehrung]>=preis;
        return `<button type="button" class="prestige-item-action prestige-item-buy gold shop-kaufen" data-kaufe="${stufe}:${waehrung}" ${reicht?"":"disabled"} aria-label="${esc(`${tr(kiste.name)}: ${preis} ${tr(label)}`)}">${artwork("gold")}${bildTag(SHOPBILD(WAEHRUNG_ICON[waehrung]),"shop-waehrung-icon")}<span>${preis} · ${tr(label)}</span></button>`;
      };
      return `<div class="prestige-item shop-kiste" data-stufe="${stufe}">
        <div class="prestige-item-kicker">${bildTag(PLAKETTE(stufe),"shop-kicker-plakette")}${tr("Kiste")} · ${tr(S.SELTENHEIT_NAMEN[stufe])}</div>
        <img class="shop-kiste-bild" src="${KISTENBILD(stufe)}" alt="" loading="lazy" draggable="false">
        <div class="prestige-item-name">${tr(kiste.name)}</div>
        <div class="prestige-item-desc">${tr("Geöffnet")}: ${k.geoeffnet[stufe]||0}</div>
        <button type="button" class="shop-chancen-toggle" data-chancen="${stufe}" aria-expanded="${offen}">${icon("navigation/info.svg")}<span>${offen?tr("Chancen verbergen"):tr("Chancen anzeigen")}</span></button>
        <div class="shop-chancen"${offen?"":" hidden"}>${chancenTabelle(stufe,p)}</div>
        <div class="shop-kiste-kauf">${knopf("marken",kiste.marken,"Duellmarken")}${knopf("kerne",kiste.kerne,"Würfelkerne")}</div>
      </div>`;
    }).join("");
    box.innerHTML=`<div class="shop-kisten-kopf"><div class="shop-schutz">${icon("gameplay/shield.svg")}<span>${schutzText}</span></div>${hinweis?`<div class="shop-hinweis" role="status">${esc(hinweis)}</div>`:""}</div><div class="shop-kisten-grid">${karten}</div>`;
    box.querySelectorAll("[data-chancen]").forEach(b=>b.onclick=()=>{const s=b.dataset.chancen;if(chancenOffen.has(s))chancenOffen.delete(s);else chancenOffen.add(s);render();});
    box.querySelectorAll("[data-kaufe]").forEach(b=>b.onclick=()=>kaufe(b.dataset.kaufe));
  }

  function renderWaehrung(p){
    const box=screen.querySelector("#shopTabCurrency");
    const pakete=PAKETE.map(paket=>`<div class="prestige-item shop-paket" data-paket="${paket.id}">
        <div class="prestige-item-kicker">${tr("Würfelkerne")}</div>
        <div class="shop-paket-bild">${bildTag(SHOPBILD(`packs/${paket.id}.webp`),"shop-paket-img")}</div>
        <div class="prestige-item-name">${tr(paket.name)}</div>
        <div class="shop-preisschild" aria-label="${esc(`${paket.menge} ${tr("Würfelkerne")}`)}">${bildTag(SHOPBILD("ribbons/price-plate.webp"),"shop-preisschild-bild")}${bildTag(SHOPBILD(WAEHRUNG_ICON.kerne),"shop-preisschild-icon")}<span class="shop-preisschild-text">${paket.menge}</span></div>
        <div class="shop-kiste-kauf"><button type="button" class="prestige-item-action shop-echtgeld" data-echtgeld="${paket.id}" aria-disabled="true">${artwork("navy")}${icon("gameplay/locked.svg")}<span>${tr("Bald verfügbar")}</span></button></div>
      </div>`).join("");
    box.innerHTML=`<div class="shop-waehrung-info">
        <p class="shop-waehrung-zeile">${bildTag(SHOPBILD("currency/duellmarke-beauty.webp"),"shop-waehrung-beauty")}<span><strong>${tr("Duellmarken")}</strong> · ${tr("verdienst du in jedem Duell und in der Kampagne. Sie kaufen Common-, Rare- und Epic-Kisten.")}</span></p>
        <p class="shop-waehrung-zeile">${bildTag(SHOPBILD("currency/wuerfelkern-beauty.webp"),"shop-waehrung-beauty")}<span><strong>${tr("Würfelkerne")}</strong> · ${tr("sind die Premium-Währung für Rare-, Epic- und Legendary-Kisten. Sie sind noch nicht sammelbar; der Kauf ist in Vorbereitung.")}</span></p>
        <table class="shop-einnahmen"><tbody>${Object.entries(S.EINNAHMEN).map(([k,v])=>`<tr><th>${tr(S.EINNAHME_NAMEN[k])}</th><td>+${v}</td></tr>`).join("")}</tbody></table>
      </div><div class="shop-kisten-grid shop-pakete">${pakete}</div>`;
    // Bewusst ohne Wirkung: es gibt keine Zahlungsanbindung.
    box.querySelectorAll("[data-echtgeld]").forEach(b=>b.onclick=e=>{e.preventDefault();});
  }

  /* ---------- Kauf und Oeffnung ---------- */
  function kaufe(schluessel){
    const [stufe,waehrung]=String(schluessel||"").split(":");
    const p=profil();
    if(!p) return;
    const e=S.kaufe(p,stufe,waehrung);
    if(e.fehler){hinweis=tr(e.fehler);render();return;}
    hinweis="";
    if(typeof renderProfiles==="function") try{renderProfiles();}catch(_err){}
    render();
    window.WDKiste?.oeffne?.({
      modus:"shop",stufe,titel:tr(S.KISTEN[stufe].name),
      karten:[{key:e.designKey,name:e.name,bild:e.bild?`${e.bild}?v=${rev()}`:"",seltenheit:e.seltenheit,duplikat:e.duplikat,rueckgabe:e.rueckgabe,rueckfall:e.rueckfall}],
      beimSchliessen:render
    });
  }

  /* ---------- Einstieg ---------- */
  const menuBtn=document.getElementById("menuPrestigeShopBtn");
  if(menuBtn){
    const vorher=menuBtn.onclick;
    menuBtn.onclick=function(ev){if(typeof vorher==="function")vorher.call(this,ev);render();};
  }
  // Der Trophy-Shop rendert sich nach jedem Kauf neu und ersetzt dabei
  // seine Listen - unsere Reiter bleiben stehen, nur das Guthaben muss nach.
  document.addEventListener("click",ev=>{
    if(ev.target.closest?.("[data-shop-buy],[data-shop-equip],[data-reset-cosmetic]")&&!screen.classList.contains("hidden")) queueMicrotask(render);
  });

  // Testguthaben (Trainingsfenster): bucht aufs im Shop gewaehlte Profil,
  // sonst aufs erste. Nur zum Ansehen der Kisten ohne Spielzeit.
  const testGuthaben=document.getElementById("testGuthabenBtn");
  if(testGuthaben) testGuthaben.addEventListener("click",()=>{
    const p=profil()||(typeof saveData!=="undefined"?saveData?.profiles?.[0]:null);
    const ziel=document.querySelector("#tutorialHubModal .utility-text");
    if(!p){if(ziel)ziel.textContent=tr("Erstelle zuerst ein Profil.");return;}
    const w=S.buche(p,{marken:2000,kerne:200});
    if(ziel) ziel.textContent=`${tr("Gebucht")}: +2000 ${tr("Duellmarken")}, +200 ${tr("Würfelkerne")} · ${p.name}: ${w.marken} / ${w.kerne}`;
    if(!screen.classList.contains("hidden")) render();
  });

  window.WDShopUi=Object.freeze({render,zeige:key=>{if(["chests","trophies","currency"].includes(key)){tab=key;render();}}});
})();
