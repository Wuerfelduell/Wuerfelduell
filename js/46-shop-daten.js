/* Shop-Daten: Waehrungen, Kisten, Ziehung, Gutschriften.
   ------------------------------------------------------------------
   Aus der To-do "Waehrungs- und Kistensystem" (16.09.):
   - Duellmarken = normale Waehrung, Wuerfelkerne = Premium-Waehrung.
     Kerne sind vorerst NICHT sammelbar (kein Verdienstweg, kein Kauf);
     nur die Testumgebung kann sie buchen.
   - Aus jeder Kiste kommt genau ein Wuerfeldesign, gezogen nach der
     Chancentabelle unten. Legendary bleibt auch bei der besten Kiste bei
     hoechstens 5 %.
   - Duplikate gibt es ab der ersten Kiste; ein doppelter Wuerfel wird in
     Duellmarken umgewandelt, gestaffelt nach seiner Seltenheit.
   - Schutzsystem: nach 10 Oeffnungen ohne Epic oder besser steigt die
     Epic-Chance je weitere Oeffnung um 2 Prozentpunkte (aus Common
     genommen), hoechstens +10. Legendary ist davon ausgenommen.
   - Der Kistenpool sind nur Designs mit `rarity` in DICE_DESIGNS. Ist ein
     Pool leer (Super Rare, Epic, Legendary bis neues Artwork kommt),
     faellt die Ziehung eine Stufe tiefer.

   Diese Datei hat keine Oberflaeche und fasst kein DOM an. Sie laeuft
   auch in Node (scripts/qa/kisten-ziehung.mjs) - deshalb greift sie nur
   auf DICE_DESIGNS und saveGameData zu, wenn es sie gibt. */
(() => {
  "use strict";

  const STUFEN=Object.freeze(["common","rare","epic","legendary"]);
  const SELTENHEITEN=Object.freeze(["common","rare","super_rare","epic","legendary"]);
  const SELTENHEIT_NAMEN=Object.freeze({common:"Common",rare:"Rare",super_rare:"Super Rare",epic:"Epic",legendary:"Legendary"});
  const SELTENHEIT_FARBEN=Object.freeze({common:"#b8b8b8",rare:"#4a8ff0",super_rare:"#2fd3a6",epic:"#b06cff",legendary:"#ffd45a"});

  // Preise: null = in dieser Waehrung nicht zu haben.
  const KISTEN=Object.freeze({
    common:   Object.freeze({name:"Common-Kiste",   marken:250,  kerne:null}),
    rare:     Object.freeze({name:"Rare-Kiste",     marken:600,  kerne:30}),
    epic:     Object.freeze({name:"Epic-Kiste",     marken:1500, kerne:75}),
    legendary:Object.freeze({name:"Legendary-Kiste",marken:null, kerne:180})
  });

  // Prozent je Seltenheit, Summe je Zeile 100. Die Tabelle aus der To-do,
  // unveraendert - sie wird im Shop vor jedem Kauf angezeigt.
  const CHANCEN=Object.freeze({
    common:   Object.freeze({common:75,rare:20,super_rare:4, epic:0.9,legendary:0.1}),
    rare:     Object.freeze({common:50,rare:35,super_rare:12,epic:2.5,legendary:0.5}),
    epic:     Object.freeze({common:25,rare:35,super_rare:25,epic:13, legendary:2}),
    legendary:Object.freeze({common:10,rare:25,super_rare:30,epic:30, legendary:5})
  });

  const RUECKGABE=Object.freeze({common:60,rare:150,super_rare:400,epic:800,legendary:2000});

  const EINNAHMEN=Object.freeze({
    duell_sieg:40,
    duell_niederlage:15,
    encounter_erst:80,
    encounter_wieder:20,
    weltboss_erst:250
  });
  const EINNAHME_NAMEN=Object.freeze({
    duell_sieg:"Duell gewonnen",
    duell_niederlage:"Duell verloren",
    encounter_erst:"Encounter erstmals geschafft",
    encounter_wieder:"Encounter wiederholt",
    weltboss_erst:"Weltboss erstmals besiegt"
  });

  const SCHUTZ=Object.freeze({ab:10,schritt:2,max:10});

  const EPIC_ODER_BESSER=new Set(["epic","legendary"]);

  const designs=()=>typeof DICE_DESIGNS==="object"&&DICE_DESIGNS?DICE_DESIGNS:{};
  const speichern=()=>{if(typeof saveGameData==="function")saveGameData();};
  const ganz=v=>Math.max(0,Math.floor(Number(v)||0));

  function wallet(profile){
    if(!profile) return {marken:0,kerne:0};
    if(!profile.wallet||typeof profile.wallet!=="object") profile.wallet={marken:0,kerne:0};
    profile.wallet.marken=ganz(profile.wallet.marken);
    profile.wallet.kerne=ganz(profile.wallet.kerne);
    return profile.wallet;
  }
  function kisten(profile){
    if(!profile) return {geoeffnet:{},ohneEpic:0,letzte:null};
    if(!profile.kisten||typeof profile.kisten!=="object") profile.kisten={geoeffnet:{},ohneEpic:0,letzte:null};
    const k=profile.kisten;
    if(!k.geoeffnet||typeof k.geoeffnet!=="object") k.geoeffnet={};
    STUFEN.forEach(s=>{k.geoeffnet[s]=ganz(k.geoeffnet[s]);});
    k.ohneEpic=ganz(k.ohneEpic);
    return k;
  }

  function seltenheitVon(designKey){
    const r=designs()[designKey]?.rarity;
    return SELTENHEITEN.includes(r)?r:null;
  }
  function pool(seltenheit){
    return Object.entries(designs()).filter(([,d])=>d&&d.rarity===seltenheit).map(([key])=>key);
  }

  // Schutzbonus in Prozentpunkten fuer die naechste Oeffnung.
  function schutzBonus(profile){
    const ohne=kisten(profile).ohneEpic;
    if(ohne<SCHUTZ.ab) return 0;
    return Math.min(SCHUTZ.max,SCHUTZ.schritt*(ohne-SCHUTZ.ab+1));
  }

  // Chancen fuer die naechste Oeffnung, Schutz eingerechnet. Legendary
  // bleibt exakt der Tabellenwert.
  function chancen(stufe,profile){
    const basis=CHANCEN[stufe];
    if(!basis) return null;
    const bonus=profile?Math.min(schutzBonus(profile),basis.common):0;
    return {
      common:+(basis.common-bonus).toFixed(2),
      rare:basis.rare,
      super_rare:basis.super_rare,
      epic:+(basis.epic+bonus).toFixed(2),
      legendary:basis.legendary,
      schutzBonus:bonus
    };
  }

  function wuerfleSeltenheit(tabelle,rnd){
    const wurf=rnd()*100;
    let summe=0;
    for(const s of SELTENHEITEN){
      summe+=Number(tabelle[s])||0;
      if(wurf<summe) return s;
    }
    return "common";
  }

  // Leere Pools: eine Stufe tiefer, bis etwas da ist. Common ist nie leer,
  // solange ein Design rarity:"common" traegt.
  function poolMitRueckfall(seltenheit){
    let index=SELTENHEITEN.indexOf(seltenheit);
    while(index>=0){
      const p=pool(SELTENHEITEN[index]);
      if(p.length) return {seltenheit:SELTENHEITEN[index],pool:p};
      index--;
    }
    return {seltenheit:null,pool:[]};
  }

  /* Die Ziehung selbst - ohne Bezahlung. Veraendert das Profil: schaltet
     das Design frei oder schreibt die Rueckgabe gut, zaehlt die Oeffnung
     und den Schutz. Gibt das Ergebnis zurueck, das die Kiste zeigt. */
  function ziehe(profile,stufe,rnd=Math.random){
    if(!profile||!KISTEN[stufe]) return null;
    const tabelle=chancen(stufe,profile);
    const gewuerfelt=wuerfleSeltenheit(tabelle,rnd);
    const {seltenheit,pool:kandidaten}=poolMitRueckfall(gewuerfelt);
    if(!seltenheit||!kandidaten.length) return null;
    const designKey=kandidaten[Math.min(kandidaten.length-1,Math.floor(rnd()*kandidaten.length))];
    if(!Array.isArray(profile.unlockedDice)) profile.unlockedDice=["classic","classic_v2"];
    const duplikat=profile.unlockedDice.includes(designKey);
    let rueckgabe=0;
    if(duplikat){rueckgabe=RUECKGABE[seltenheit]||0;wallet(profile).marken+=rueckgabe;}
    else profile.unlockedDice.push(designKey);
    const k=kisten(profile);
    k.geoeffnet[stufe]=ganz(k.geoeffnet[stufe])+1;
    k.ohneEpic=EPIC_ODER_BESSER.has(seltenheit)?0:k.ohneEpic+1;
    const ergebnis={
      stufe,gewuerfelt,seltenheit,designKey,
      name:designs()[designKey]?.name||designKey,
      bild:designs()[designKey]?.previewAsset||"",
      duplikat,rueckgabe,
      schutzBonus:tabelle.schutzBonus,
      rueckfall:gewuerfelt!==seltenheit,
      zeit:Date.now()
    };
    k.letzte=ergebnis;
    return ergebnis;
  }

  /* Kauf: Preis pruefen, abbuchen, ziehen, speichern. Rueckgabe entweder
     das Ergebnis oder {fehler}. */
  function kaufe(profile,stufe,waehrung,rnd=Math.random){
    const kiste=KISTEN[stufe];
    if(!profile||!kiste) return {fehler:"Unbekannte Kiste."};
    if(waehrung!=="marken"&&waehrung!=="kerne") return {fehler:"Unbekannte Währung."};
    const preis=kiste[waehrung];
    if(preis==null) return {fehler:"Diese Kiste gibt es nicht für diese Währung."};
    const w=wallet(profile);
    if(w[waehrung]<preis) return {fehler:"Nicht genug Guthaben."};
    w[waehrung]-=preis;
    const ergebnis=ziehe(profile,stufe,rnd);
    if(!ergebnis){w[waehrung]+=preis;return {fehler:"Kein Würfeldesign im Pool."};}
    ergebnis.preis=preis;ergebnis.waehrung=waehrung;
    speichern();
    return ergebnis;
  }

  /* Gutschriften aus dem Spiel. Merkt sich die letzten Buchungen, damit
     die Siegerbox sie in einer Zeile zeigen kann. */
  let letzteGutschriften=[];
  function verdiene(profile,ereignis){
    const betrag=EINNAHMEN[ereignis];
    if(!profile||!betrag) return 0;
    wallet(profile).marken+=betrag;
    letzteGutschriften.push({profilId:profile.id,name:profile.name||"",ereignis,betrag,gesamt:wallet(profile).marken});
    return betrag;
  }
  function gutschriftenAbholen(){const g=letzteGutschriften;letzteGutschriften=[];return g;}
  function gutschriftText(escape=s=>s){
    const g=gutschriftenAbholen();
    if(!g.length) return "";
    return g.map(x=>`<br>💰 <strong>+${x.betrag} Duellmarken</strong> für ${escape(x.name)} · Gesamt: ${x.gesamt}`).join("");
  }

  // Nur fuer die Testumgebung: Guthaben buchen.
  function buche(profile,{marken=0,kerne=0}={}){
    if(!profile) return null;
    const w=wallet(profile);
    w.marken=ganz(w.marken+Number(marken||0));
    w.kerne=ganz(w.kerne+Number(kerne||0));
    speichern();
    return {...w};
  }

  window.WDShop=Object.freeze({
    STUFEN,SELTENHEITEN,SELTENHEIT_NAMEN,SELTENHEIT_FARBEN,KISTEN,CHANCEN,RUECKGABE,EINNAHMEN,EINNAHME_NAMEN,SCHUTZ,
    wallet,kisten,seltenheitVon,pool,schutzBonus,chancen,ziehe,kaufe,verdiene,gutschriftenAbholen,gutschriftText,buche
  });
})();
