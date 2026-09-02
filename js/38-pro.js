(function DiceDuelProModule(){
  'use strict';

  const VERSION = '28.10.0';
  const PRODUCT_IDS = Object.freeze({
    monthly: 'diceduel_pro_monthly',
    yearly: 'diceduel_pro_yearly'
  });
  const STORAGE_KEY = 'diceduel_pro_features_v1';
  const DATA_SCHEMA = 1;
  const MAX_BATTLES = 500;
  const MAX_RUNS = 150;
  const TRUSTED_SOURCES = new Set([
    'google-play', 'app-store', 'stripe-backend',
    'firebase-functions', 'server', 'test-provider'
  ]);
  const DEV_HOSTS = new Set(['localhost', '127.0.0.1', '::1']);

  const translations = {
    de: {
      pro: 'PRO', title: 'DiceDuel Pro', subtitle: 'Mehr Überblick. Mehr Style. Keine gekaufte Stärke.',
      overview: 'Übersicht', vault: 'Kampfarchiv', loadouts: 'Loadouts', style: 'Stil',
      locked: 'Pro ist nicht aktiv', active: 'Pro ist aktiv', preview: 'Lokale Pro-Vorschau',
      purchase: 'Pro freischalten', yearly: 'Jahresabo', monthly: 'Monatsabo', restore: 'Käufe wiederherstellen',
      providerMissing: 'Store-Verbindung noch nicht eingerichtet. Die Oberfläche ist bereit; der Kauf bleibt sicher gesperrt.',
      providerError: 'Der Store konnte Pro gerade nicht bestätigen.', verified: 'Vom Store bestätigt',
      benefitVault: 'Kampfarchiv & Trends', benefitVaultText: 'Bis zu 500 Partien, Winrate, Serien, Lieblingsfähigkeiten und exportierbare Daten.',
      benefitRush: 'Boss-Rush-Chronik', benefitRushText: 'Runs, erreichte Stufen, Builds und persönliche Rekorde auf einen Blick.',
      benefitLoadouts: '5 Loadout-Slots', benefitLoadoutsText: 'Würfel, Angriffseffekt, Theme, Aura und Lieblingsbuild als Preset speichern.',
      benefitThemes: 'Exklusive Themes', benefitThemesText: 'Arcane Sapphire, Solar Ivory und Void Amethyst verändern die gesamte Präsentation.',
      benefitAura: 'Profil-Auren', benefitAuraText: 'Premium-Auren werden im Profil und über den Online-Cosmetic-Payload sichtbar.',
      fair: 'Fair Play bleibt unangetastet', fairText: 'Keine Welt, Fähigkeit, Würfelchance, HP oder Schadensstärke steckt hinter Pro.',
      battles: 'Partien', wins: 'Siege', winrate: 'Winrate', streak: 'Beste Serie', avgRounds: 'Ø Runden',
      noBattles: 'Noch keine Partien im Archiv. Abschlüsse werden automatisch erfasst.',
      noRuns: 'Noch keine Boss-Rush-Runs erfasst.', bossRush: 'Boss-Rush-Chronik', stage: 'Stufe',
      victory: 'Sieg', defeat: 'Niederlage', draw: 'Unentschieden', unknown: 'Unbekannt',
      exportJson: 'JSON exportieren', exportCsv: 'CSV exportieren', clearHistory: 'Archiv leeren',
      confirmClear: 'Das gesamte lokale Pro-Archiv wirklich löschen?',
      slot: 'Slot', empty: 'Leer', save: 'Aktuellen Stil speichern', apply: 'Anwenden', remove: 'Leeren', rename: 'Name',
      loadoutSaved: 'Loadout gespeichert.', loadoutApplied: 'Loadout angewendet.', lockedFeature: 'Mit DiceDuel Pro freischalten',
      themes: 'Premium-Themes', auras: 'Profil-Auren', defaultTheme: 'Standard', noAura: 'Keine Aura',
      arcane: 'Arcane Sapphire', solar: 'Solar Ivory', void: 'Void Amethyst',
      crown: 'Crownfire', pulse: 'Arcane Pulse', eclipse: 'Eclipse Ring',
      devEnable: 'Vorschau aktivieren', devDisable: 'Vorschau beenden',
      close: 'Schließen', current: 'Aktiv', select: 'Auswählen',
      privacy: 'Pro-Daten bleiben lokal. Der Abo-Status wird niemals aus Savegame, LocalStorage oder URL übernommen.',
      bestStage: 'Beste Stufe', runs: 'Runs', completed: 'Abgeschlossen', date: 'Datum', mode: 'Modus', result: 'Ergebnis', rounds: 'Runden', duration: 'Dauer',
      seconds: 's', minutes: 'min', favoriteAbility: 'Lieblingsfähigkeit', noData: 'Keine Daten',
      previewNote: 'Die lokale Vorschau ist nicht persistent und nur in einer Entwicklungsumgebung verfügbar.'
    },
    en: {
      pro: 'PRO', title: 'DiceDuel Pro', subtitle: 'More insight. More style. No purchased power.',
      overview: 'Overview', vault: 'Battle Vault', loadouts: 'Loadouts', style: 'Style',
      locked: 'Pro is not active', active: 'Pro is active', preview: 'Local Pro preview',
      purchase: 'Unlock Pro', yearly: 'Yearly plan', monthly: 'Monthly plan', restore: 'Restore purchases',
      providerMissing: 'The store connection is not configured yet. The UI is ready; purchasing remains securely locked.',
      providerError: 'The store could not verify Pro right now.', verified: 'Store verified',
      benefitVault: 'Battle Vault & trends', benefitVaultText: 'Up to 500 matches, win rate, streaks, favorite abilities, and exportable data.',
      benefitRush: 'Boss Rush chronicle', benefitRushText: 'Runs, reached stages, builds, and personal records at a glance.',
      benefitLoadouts: '5 loadout slots', benefitLoadoutsText: 'Save dice, attack effect, theme, aura, and favorite build as presets.',
      benefitThemes: 'Exclusive themes', benefitThemesText: 'Arcane Sapphire, Solar Ivory, and Void Amethyst reshape the presentation.',
      benefitAura: 'Profile auras', benefitAuraText: 'Premium auras appear in profiles and the online cosmetic payload.',
      fair: 'Fair play stays untouched', fairText: 'No world, ability, dice chance, HP, or damage power is locked behind Pro.',
      battles: 'Matches', wins: 'Wins', winrate: 'Win rate', streak: 'Best streak', avgRounds: 'Avg. rounds',
      noBattles: 'No matches in the vault yet. Completed games are captured automatically.',
      noRuns: 'No Boss Rush runs captured yet.', bossRush: 'Boss Rush chronicle', stage: 'Stage',
      victory: 'Victory', defeat: 'Defeat', draw: 'Draw', unknown: 'Unknown',
      exportJson: 'Export JSON', exportCsv: 'Export CSV', clearHistory: 'Clear vault',
      confirmClear: 'Delete the entire local Pro vault?',
      slot: 'Slot', empty: 'Empty', save: 'Save current style', apply: 'Apply', remove: 'Clear', rename: 'Name',
      loadoutSaved: 'Loadout saved.', loadoutApplied: 'Loadout applied.', lockedFeature: 'Unlock with DiceDuel Pro',
      themes: 'Premium themes', auras: 'Profile auras', defaultTheme: 'Default', noAura: 'No aura',
      arcane: 'Arcane Sapphire', solar: 'Solar Ivory', void: 'Void Amethyst',
      crown: 'Crownfire', pulse: 'Arcane Pulse', eclipse: 'Eclipse Ring',
      devEnable: 'Enable preview', devDisable: 'End preview',
      close: 'Close', current: 'Active', select: 'Select',
      privacy: 'Pro data stays local. Subscription state is never accepted from saves, LocalStorage, or URL parameters.',
      bestStage: 'Best stage', runs: 'Runs', completed: 'Completed', date: 'Date', mode: 'Mode', result: 'Result', rounds: 'Rounds', duration: 'Duration',
      seconds: 's', minutes: 'min', favoriteAbility: 'Favorite ability', noData: 'No data',
      previewNote: 'Local preview is non-persistent and only available in a development environment.'
    }
  };

  const runtime = {
    entitlement: Object.freeze({ active:false, verified:false, status:'unknown', source:null, expiresAt:null }),
    preview: false,
    open: false,
    tab: 'overview',
    battleStartedAt: Date.now(),
    captureTimer: 0,
    lastCaptureSignature: '',
    lastCaptureAt: 0,
    observer: null,
    providerError: ''
  };

  function language(){
    const raw = String(window.WD_LANGUAGE || window.currentLanguage || document.documentElement.lang || safeGet('language') || 'de').toLowerCase();
    return raw.startsWith('en') ? 'en' : 'de';
  }
  function t(key){ return translations[language()][key] || translations.de[key] || key; }
  function safeGet(key){ try { return localStorage.getItem(key); } catch(_) { return null; } }
  function safeSet(key,value){ try { localStorage.setItem(key,value); return true; } catch(_) { return false; } }
  function clone(value){ try { return JSON.parse(JSON.stringify(value)); } catch(_) { return null; } }
  function uid(prefix){ return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2,9)}`; }
  function esc(value){ return String(value == null ? '' : value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])); }
  function number(value, fallback=0){ const n=Number(value); return Number.isFinite(n) ? n : fallback; }
  function isDev(){ return location.protocol === 'file:' || DEV_HOSTS.has(location.hostname); }

  function defaultData(){
    return {
      schema: DATA_SCHEMA,
      battles: [], bossRushRuns: [],
      loadouts: Array.from({length:5}, (_,i)=>({ id:`slot_${i+1}`, name:`${t('slot')} ${i+1}`, snapshot:null, updatedAt:0 })),
      preferences: { theme:'default', aura:'none' }
    };
  }
  function loadData(){
    const fallback = defaultData();
    try {
      const parsed = JSON.parse(safeGet(STORAGE_KEY) || 'null');
      if(!parsed || typeof parsed !== 'object') return fallback;
      const slots = Array.isArray(parsed.loadouts) ? parsed.loadouts.slice(0,5) : [];
      while(slots.length < 5) slots.push(fallback.loadouts[slots.length]);
      return {
        schema: DATA_SCHEMA,
        battles: Array.isArray(parsed.battles) ? parsed.battles.slice(0,MAX_BATTLES) : [],
        bossRushRuns: Array.isArray(parsed.bossRushRuns) ? parsed.bossRushRuns.slice(0,MAX_RUNS) : [],
        loadouts: slots.map((s,i)=>({ id:`slot_${i+1}`, name:String(s?.name || `${t('slot')} ${i+1}`).slice(0,32), snapshot:s?.snapshot || null, updatedAt:number(s?.updatedAt) })),
        preferences: { theme:String(parsed.preferences?.theme || 'default'), aura:String(parsed.preferences?.aura || 'none') }
      };
    } catch(_) { return fallback; }
  }
  let data = loadData();
  function persist(){ safeSet(STORAGE_KEY, JSON.stringify(data)); }

  function provider(){
    const p = window.DiceDuelBilling || window.WD_BILLING_PROVIDER || null;
    if(p && typeof p === 'object') return p;
    return null;
  }
  function normalizeEntitlement(value){
    if(!value || typeof value !== 'object') return null;
    const source = String(value.source || '').toLowerCase();
    const expiresAt = value.expiresAt ? new Date(value.expiresAt).getTime() : null;
    const active = value.active === true && value.verified === true && TRUSTED_SOURCES.has(source) && (!expiresAt || expiresAt > Date.now());
    return Object.freeze({ active, verified:value.verified === true, status:active ? 'active' : 'inactive', source, expiresAt:expiresAt || null, productId:String(value.productId || '') });
  }
  async function refreshEntitlement(){
    runtime.providerError = '';
    const p = provider();
    if(!p || typeof p.getEntitlement !== 'function'){
      runtime.entitlement = Object.freeze({ active:false, verified:false, status:'provider-missing', source:null, expiresAt:null });
      applyPremiumPresentation(); render(); return runtime.entitlement;
    }
    try {
      const result = normalizeEntitlement(await p.getEntitlement({ productIds:Object.values(PRODUCT_IDS), feature:'diceduel-pro' }));
      runtime.entitlement = result || Object.freeze({ active:false, verified:false, status:'invalid', source:null, expiresAt:null });
    } catch(error){
      runtime.providerError = String(error?.message || error || 'provider error');
      runtime.entitlement = Object.freeze({ active:false, verified:false, status:'error', source:null, expiresAt:null });
    }
    applyPremiumPresentation(); render(); emit('diceduel:pro-entitlement', publicEntitlement());
    return runtime.entitlement;
  }
  function hasAccess(){ return runtime.entitlement.active === true || (runtime.preview === true && isDev()); }
  function publicEntitlement(){ return { active:hasAccess(), storeVerified:runtime.entitlement.active === true, preview:runtime.preview === true && isDev(), status:runtime.entitlement.status, source:runtime.entitlement.source, expiresAt:runtime.entitlement.expiresAt }; }
  async function purchase(plan){
    const p=provider();
    if(!p || typeof p.purchase !== 'function'){ runtime.providerError=t('providerMissing'); render(); return false; }
    try { await p.purchase({ productId:PRODUCT_IDS[plan === 'yearly' ? 'yearly' : 'monthly'] }); await refreshEntitlement(); return runtime.entitlement.active; }
    catch(error){ runtime.providerError=String(error?.message || t('providerError')); render(); return false; }
  }
  async function restore(){
    const p=provider();
    if(!p || typeof p.restore !== 'function'){ runtime.providerError=t('providerMissing'); render(); return false; }
    try { await p.restore({ productIds:Object.values(PRODUCT_IDS) }); await refreshEntitlement(); return runtime.entitlement.active; }
    catch(error){ runtime.providerError=String(error?.message || t('providerError')); render(); return false; }
  }

  function emit(name,detail){ try { window.dispatchEvent(new CustomEvent(name,{detail})); } catch(_){} }
  function currentMode(){
    const state = window.state || window.gameState || window.GAME_STATE || {};
    const raw = state.mode || state.gameMode || state.campaignMode || document.body?.dataset?.mode || '';
    const text = String(raw || '').toLowerCase();
    if(text.includes('boss') && text.includes('rush')) return 'boss-rush';
    if(text.includes('trio')) return 'trio';
    if(text.includes('duo')) return 'duo';
    if(text.includes('campaign') || text.includes('solo')) return 'solo';
    if(text.includes('online')) return 'online';
    return text || 'local';
  }
  function currentPlayers(){
    const state = window.state || window.gameState || window.GAME_STATE || {};
    const candidates = [state.players,state.heroes,state.party,window.players,window.heroes];
    return candidates.find(Array.isArray) || [];
  }
  function currentAbilities(){
    const found=[];
    for(const p of currentPlayers()){
      const arr = p?.abilities || p?.abilityIds || p?.skills || [];
      for(const a of arr){
        const name = typeof a === 'string' ? a : (a?.name || a?.id || '');
        if(name && !found.includes(String(name))) found.push(String(name));
      }
    }
    return found.slice(0,12);
  }
  function inferStats(){
    const state = window.state || window.gameState || window.GAME_STATE || {};
    const stats = state.stats || window.gameStats || window.matchStats || {};
    return {
      rounds:number(stats.rounds ?? state.round ?? state.roundNumber),
      damage:number(stats.damageDealt ?? stats.totalDamage ?? state.damageDealt),
      healing:number(stats.healingDone ?? stats.totalHealing ?? state.healingDone),
      finalHp:currentPlayers().map(p=>number(p?.hp ?? p?.health)).filter(v=>v>0),
      abilities:currentAbilities()
    };
  }
  function normalizeBattle(input){
    const src = input && typeof input === 'object' ? input : {};
    const stats = inferStats();
    const resultRaw=String(src.result || src.outcome || 'unknown').toLowerCase();
    const result = /victory|win|sieg/.test(resultRaw) ? 'victory' : /defeat|loss|niederlage|verloren/.test(resultRaw) ? 'defeat' : /draw|unentschieden/.test(resultRaw) ? 'draw' : 'unknown';
    return {
      id:String(src.id || uid('battle')),
      at:number(src.at,Date.now()),
      mode:String(src.mode || currentMode()), result,
      durationMs:Math.max(0,number(src.durationMs,Date.now()-runtime.battleStartedAt)),
      rounds:number(src.rounds,stats.rounds), damage:number(src.damage,stats.damage), healing:number(src.healing,stats.healing),
      finalHp:Array.isArray(src.finalHp) ? src.finalHp.map(Number) : stats.finalHp,
      abilities:Array.isArray(src.abilities) ? src.abilities.map(String).slice(0,12) : stats.abilities,
      world:String(src.world || src.worldId || ''), encounter:String(src.encounter || src.encounterId || ''),
      bossRushStage:number(src.bossRushStage ?? src.stage)
    };
  }
  function recordBattle(input){
    const item=normalizeBattle(input);
    const signature=[item.mode,item.result,item.world,item.encounter,item.bossRushStage,item.rounds,Math.floor(item.at/15000)].join('|');
    if(data.battles.some(b=>b.signature===signature)) return null;
    item.signature=signature;
    data.battles.unshift(item); data.battles=data.battles.slice(0,MAX_BATTLES);
    persist(); render(); emit('diceduel:pro-battle-recorded',clone(item));
    if(item.mode==='boss-rush' && item.bossRushStage>0) recordBossRush({ at:item.at, stage:item.bossRushStage, completed:item.result==='victory' && item.bossRushStage>=10, result:item.result, durationMs:item.durationMs, abilities:item.abilities });
    return clone(item);
  }
  function recordBossRush(input){
    const src=input && typeof input==='object' ? input : {};
    const item={ id:String(src.id||uid('rush')), at:number(src.at,Date.now()), stage:Math.max(0,number(src.stage)), completed:src.completed===true, result:String(src.result||'unknown'), durationMs:Math.max(0,number(src.durationMs)), abilities:Array.isArray(src.abilities)?src.abilities.map(String).slice(0,12):currentAbilities() };
    const sig=[item.stage,item.completed,item.result,Math.floor(item.at/15000)].join('|');
    if(data.bossRushRuns.some(r=>r.signature===sig)) return null;
    item.signature=sig; data.bossRushRuns.unshift(item); data.bossRushRuns=data.bossRushRuns.slice(0,MAX_RUNS); persist(); render(); emit('diceduel:pro-bossrush-recorded',clone(item)); return clone(item);
  }
  function analytics(){
    const battles=data.battles; const wins=battles.filter(b=>b.result==='victory').length;
    let streak=0,best=0;
    for(const b of [...battles].reverse()){ if(b.result==='victory'){streak++;best=Math.max(best,streak);} else if(b.result==='defeat') streak=0; }
    const abilityCounts={}; battles.forEach(b=>(b.abilities||[]).forEach(a=>abilityCounts[a]=(abilityCounts[a]||0)+1));
    const favorite=Object.entries(abilityCounts).sort((a,b)=>b[1]-a[1])[0]?.[0] || '';
    return { battles:battles.length,wins,winrate:battles.length?Math.round(wins/battles.length*100):0,bestStreak:best,avgRounds:battles.length?(battles.reduce((s,b)=>s+number(b.rounds),0)/battles.length).toFixed(1):'0.0',favoriteAbility:favorite,bestBossRushStage:data.bossRushRuns.reduce((m,r)=>Math.max(m,number(r.stage)),0),bossRushRuns:data.bossRushRuns.length,bossRushCompleted:data.bossRushRuns.filter(r=>r.completed).length };
  }

  const SNAPSHOT_KEYS = ['selectedDiceDesign','selectedDiceSkin','diceDesign','diceSkin','selectedAttackEffect','attackEffect','attackFx','selectedAbilityLoadout','favoriteAbilities'];
  function readStateValue(keys){
    const sources=[window.state,window.gameState,window.profile,window.currentProfile].filter(Boolean);
    for(const source of sources) for(const key of keys) if(source && source[key]!=null) return clone(source[key]);
    for(const key of keys){ const v=safeGet(key); if(v!=null){ try{return JSON.parse(v);}catch(_){return v;} } }
    return null;
  }
  function collectLoadout(){
    return { version:1, savedAt:Date.now(), dice:readStateValue(['selectedDiceDesign','selectedDiceSkin','diceDesign','diceSkin']), attackEffect:readStateValue(['selectedAttackEffect','attackEffect','attackFx']), abilityPreference:readStateValue(['selectedAbilityLoadout','favoriteAbilities']), theme:data.preferences.theme, aura:data.preferences.aura };
  }
  function callFirst(names,value){
    for(const name of names){ if(typeof window[name]==='function'){ try{ window[name](value); return true; }catch(_){} } }
    return false;
  }
  function applySnapshot(snapshot){
    if(!snapshot || !hasAccess()) return false;
    if(snapshot.dice!=null) callFirst(['equipDiceDesign','selectDiceDesign','setDiceDesign','setDiceSkin'],clone(snapshot.dice));
    if(snapshot.attackEffect!=null) callFirst(['equipAttackEffect','selectAttackEffect','setAttackEffect'],clone(snapshot.attackEffect));
    if(snapshot.abilityPreference!=null) emit('diceduel:pro-ability-preference',{ value:clone(snapshot.abilityPreference) });
    if(['default','arcane','solar','void'].includes(snapshot.theme)) data.preferences.theme=snapshot.theme;
    if(['none','crown','pulse','eclipse'].includes(snapshot.aura)) data.preferences.aura=snapshot.aura;
    persist(); applyPremiumPresentation(); emit('diceduel:pro-loadout-applied',clone(snapshot)); return true;
  }
  function saveLoadout(index,name){
    if(!hasAccess() || index<0 || index>4) return false;
    const slot=data.loadouts[index]; slot.name=String(name||slot.name||`${t('slot')} ${index+1}`).trim().slice(0,32) || `${t('slot')} ${index+1}`; slot.snapshot=collectLoadout(); slot.updatedAt=Date.now(); persist(); render(); toast(t('loadoutSaved')); return true;
  }
  function clearLoadout(index){ if(!hasAccess()||index<0||index>4)return false; data.loadouts[index].snapshot=null;data.loadouts[index].updatedAt=0;persist();render();return true; }
  function applyLoadout(index){ if(!hasAccess()||!data.loadouts[index]?.snapshot)return false; const ok=applySnapshot(data.loadouts[index].snapshot);render();if(ok)toast(t('loadoutApplied'));return ok; }

  function setTheme(value){ if(!hasAccess())return false; if(!['default','arcane','solar','void'].includes(value))return false; data.preferences.theme=value;persist();applyPremiumPresentation();render();return true; }
  function setAura(value){ if(!hasAccess())return false; if(!['none','crown','pulse','eclipse'].includes(value))return false; data.preferences.aura=value;persist();applyPremiumPresentation();render();return true; }
  function applyPremiumPresentation(){
    const root=document.documentElement;
    const access=hasAccess();
    root.dataset.ddPro=access?'active':'locked';
    root.dataset.ddProTheme=access?data.preferences.theme:'default';
    root.dataset.ddProAura=access?data.preferences.aura:'none';
  }
  function publicCosmetics(){ return hasAccess()?{ pro:true, aura:data.preferences.aura, theme:data.preferences.theme, badge:'diceduel-pro' }:{ pro:false }; }
  function decorateOnlinePayload(payload){ const next={...(payload||{})}; if(hasAccess()) next.proCosmetics=publicCosmetics(); else delete next.proCosmetics; return next; }

  function formatDuration(ms){ const sec=Math.max(0,Math.round(number(ms)/1000)); return sec>=60?`${Math.floor(sec/60)} ${t('minutes')} ${sec%60} ${t('seconds')}`:`${sec} ${t('seconds')}`; }
  function dateText(at){ try{return new Intl.DateTimeFormat(language()==='de'?'de-AT':'en',{dateStyle:'medium',timeStyle:'short'}).format(new Date(at));}catch(_){return new Date(at).toLocaleString();} }
  function resultText(result){ return result==='victory'?t('victory'):result==='defeat'?t('defeat'):result==='draw'?t('draw'):t('unknown'); }
  function accessPanel(inner){ return hasAccess()?inner:`<div class="dd-pro-lock"><span class="dd-pro-lock-crown">♛</span><strong>${esc(t('lockedFeature'))}</strong></div>${inner.replaceAll('data-pro-action','data-pro-locked')}`; }
  function statusMarkup(){
    const e=publicEntitlement();
    const label=e.storeVerified?t('active'):e.preview?t('preview'):t('locked');
    const cls=e.active?'is-active':'is-locked';
    return `<div class="dd-pro-status ${cls}"><span></span><strong>${esc(label)}</strong>${e.storeVerified?`<small>${esc(t('verified'))}</small>`:''}</div>`;
  }
  function benefitsMarkup(){
    const items=[['▦','benefitVault','benefitVaultText'],['♜','benefitRush','benefitRushText'],['▤','benefitLoadouts','benefitLoadoutsText'],['✦','benefitThemes','benefitThemesText'],['◉','benefitAura','benefitAuraText']];
    return `<div class="dd-pro-benefits">${items.map(([icon,a,b])=>`<article><i>${icon}</i><div><h3>${esc(t(a))}</h3><p>${esc(t(b))}</p></div></article>`).join('')}</div>`;
  }
  function overviewMarkup(){
    const e=publicEntitlement();
    return `<section class="dd-pro-section"><div class="dd-pro-hero"><div><span class="dd-pro-kicker">DICEDUEL</span><h2>${esc(t('title'))}</h2><p>${esc(t('subtitle'))}</p></div>${statusMarkup()}</div>${benefitsMarkup()}<article class="dd-pro-fair"><strong>✓ ${esc(t('fair'))}</strong><p>${esc(t('fairText'))}</p></article>${!e.storeVerified?`<div class="dd-pro-purchase"><button data-pro-action="purchase-monthly">${esc(t('monthly'))}</button><button class="primary" data-pro-action="purchase-yearly">${esc(t('yearly'))}</button><button class="ghost" data-pro-action="restore">${esc(t('restore'))}</button>${runtime.entitlement.status==='provider-missing'?`<p>${esc(t('providerMissing'))}</p>`:''}${runtime.providerError?`<p class="error">${esc(runtime.providerError)}</p>`:''}</div>`:''}${isDev()?`<div class="dd-pro-dev"><button data-pro-action="toggle-preview">${esc(runtime.preview?t('devDisable'):t('devEnable'))}</button><small>${esc(t('previewNote'))}</small></div>`:''}<p class="dd-pro-privacy">${esc(t('privacy'))}</p></section>`;
  }
  function vaultMarkup(){
    const a=analytics();
    const battles=data.battles.slice(0,50);
    const runs=data.bossRushRuns.slice(0,30);
    const stats=`<div class="dd-pro-stats"><article><strong>${a.battles}</strong><span>${esc(t('battles'))}</span></article><article><strong>${a.wins}</strong><span>${esc(t('wins'))}</span></article><article><strong>${a.winrate}%</strong><span>${esc(t('winrate'))}</span></article><article><strong>${a.bestStreak}</strong><span>${esc(t('streak'))}</span></article><article><strong>${a.avgRounds}</strong><span>${esc(t('avgRounds'))}</span></article></div>`;
    const table=battles.length?`<div class="dd-pro-table-wrap"><table><thead><tr><th>${esc(t('date'))}</th><th>${esc(t('mode'))}</th><th>${esc(t('result'))}</th><th>${esc(t('rounds'))}</th><th>${esc(t('duration'))}</th></tr></thead><tbody>${battles.map(b=>`<tr><td>${esc(dateText(b.at))}</td><td>${esc(b.mode)}</td><td><span class="result-${esc(b.result)}">${esc(resultText(b.result))}</span></td><td>${number(b.rounds)||'–'}</td><td>${esc(formatDuration(b.durationMs))}</td></tr>`).join('')}</tbody></table></div>`:`<p class="dd-pro-empty">${esc(t('noBattles'))}</p>`;
    const rush=runs.length?`<div class="dd-pro-runs">${runs.map(r=>`<article><strong>${esc(t('stage'))} ${number(r.stage)}</strong><span>${esc(dateText(r.at))}</span><small>${r.completed?esc(t('completed')):esc(resultText(r.result))} · ${esc(formatDuration(r.durationMs))}</small></article>`).join('')}</div>`:`<p class="dd-pro-empty">${esc(t('noRuns'))}</p>`;
    return accessPanel(`<section class="dd-pro-section"><h2>${esc(t('vault'))}</h2>${stats}<div class="dd-pro-insight"><span>${esc(t('favoriteAbility'))}</span><strong>${esc(a.favoriteAbility||t('noData'))}</strong></div>${table}<div class="dd-pro-actions"><button data-pro-action="export-json">${esc(t('exportJson'))}</button><button data-pro-action="export-csv">${esc(t('exportCsv'))}</button><button class="danger" data-pro-action="clear-history">${esc(t('clearHistory'))}</button></div><h2>${esc(t('bossRush'))}</h2><div class="dd-pro-stats compact"><article><strong>${a.bestBossRushStage}</strong><span>${esc(t('bestStage'))}</span></article><article><strong>${a.bossRushRuns}</strong><span>${esc(t('runs'))}</span></article><article><strong>${a.bossRushCompleted}</strong><span>${esc(t('completed'))}</span></article></div>${rush}</section>`);
  }
  function loadoutsMarkup(){
    return accessPanel(`<section class="dd-pro-section"><h2>${esc(t('loadouts'))}</h2><div class="dd-pro-loadouts">${data.loadouts.map((slot,i)=>`<article class="${slot.snapshot?'filled':'empty'}"><div><span>${esc(t('slot'))} ${i+1}</span><input maxlength="32" value="${esc(slot.name)}" aria-label="${esc(t('rename'))}" data-loadout-name="${i}"></div><strong>${slot.snapshot?esc([slot.snapshot.theme,slot.snapshot.aura].filter(Boolean).join(' · ')):esc(t('empty'))}</strong><div><button data-pro-action="save-loadout" data-index="${i}">${esc(t('save'))}</button><button class="primary" data-pro-action="apply-loadout" data-index="${i}" ${slot.snapshot?'':'disabled'}>${esc(t('apply'))}</button><button class="ghost" data-pro-action="clear-loadout" data-index="${i}" ${slot.snapshot?'':'disabled'}>${esc(t('remove'))}</button></div></article>`).join('')}</div></section>`);
  }
  function choiceCard(type,value,label,current){ return `<button class="dd-pro-choice ${current===value?'selected':''}" data-pro-action="set-${type}" data-value="${esc(value)}"><span class="preview ${type}-${esc(value)}"></span><strong>${esc(label)}</strong><small>${current===value?esc(t('current')):esc(t('select'))}</small></button>`; }
  function styleMarkup(){
    const p=data.preferences;
    return accessPanel(`<section class="dd-pro-section"><h2>${esc(t('themes'))}</h2><div class="dd-pro-choices">${choiceCard('theme','default',t('defaultTheme'),p.theme)}${choiceCard('theme','arcane',t('arcane'),p.theme)}${choiceCard('theme','solar',t('solar'),p.theme)}${choiceCard('theme','void',t('void'),p.theme)}</div><h2>${esc(t('auras'))}</h2><div class="dd-pro-choices">${choiceCard('aura','none',t('noAura'),p.aura)}${choiceCard('aura','crown',t('crown'),p.aura)}${choiceCard('aura','pulse',t('pulse'),p.aura)}${choiceCard('aura','eclipse',t('eclipse'),p.aura)}</div></section>`);
  }
  function shell(){
    return `<div class="dd-pro-backdrop" data-pro-action="close"></div><div class="dd-pro-dialog" role="dialog" aria-modal="true" aria-labelledby="dd-pro-title"><header><div><span class="dd-pro-crown">♛</span><div><strong id="dd-pro-title">${esc(t('title'))}</strong><small>${esc(t('subtitle'))}</small></div></div><button data-pro-action="close" aria-label="${esc(t('close'))}">×</button></header><nav>${['overview','vault','loadouts','style'].map(k=>`<button data-pro-action="tab" data-tab="${k}" class="${runtime.tab===k?'active':''}">${esc(t(k))}</button>`).join('')}</nav><main>${runtime.tab==='vault'?vaultMarkup():runtime.tab==='loadouts'?loadoutsMarkup():runtime.tab==='style'?styleMarkup():overviewMarkup()}</main></div>`;
  }
  function ensureRoot(){
    let root=document.getElementById('dd-pro-root');
    if(!root){ root=document.createElement('div'); root.id='dd-pro-root'; root.hidden=true; document.body.appendChild(root); }
    return root;
  }
  function ensureEntry(){
    if(document.getElementById('dd-pro-entry')) return;
    const button=document.createElement('button'); button.id='dd-pro-entry'; button.type='button'; button.innerHTML='<span>♛</span><strong>PRO</strong>'; button.addEventListener('click',()=>open()); document.body.appendChild(button);
  }
  function open(tab){ runtime.open=true; if(tab)runtime.tab=tab; const root=ensureRoot();root.hidden=false;document.body.classList.add('dd-pro-modal-open');render(); }
  function close(){ runtime.open=false;const root=ensureRoot();root.hidden=true;document.body.classList.remove('dd-pro-modal-open'); }
  function render(){
    if(!document.body)return; ensureEntry();applyPremiumPresentation();const root=ensureRoot();if(!runtime.open)return;root.innerHTML=shell();
  }
  function toast(message){ let el=document.getElementById('dd-pro-toast');if(!el){el=document.createElement('div');el.id='dd-pro-toast';document.body.appendChild(el);}el.textContent=message;el.classList.add('show');clearTimeout(el._timer);el._timer=setTimeout(()=>el.classList.remove('show'),2200); }
  function download(name,mime,text){ const blob=new Blob([text],{type:mime});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),1000); }
  function exportJson(){ if(!hasAccess())return;download(`diceduel-pro-vault-${Date.now()}.json`,'application/json',JSON.stringify({version:VERSION,exportedAt:new Date().toISOString(),battles:data.battles,bossRushRuns:data.bossRushRuns},null,2)); }
  function exportCsv(){ if(!hasAccess())return;const rows=[['date','mode','result','rounds','durationMs','damage','healing','world','encounter','abilities'],...data.battles.map(b=>[new Date(b.at).toISOString(),b.mode,b.result,b.rounds,b.durationMs,b.damage,b.healing,b.world,b.encounter,(b.abilities||[]).join('|')])];const csv=rows.map(r=>r.map(v=>`"${String(v??'').replaceAll('"','""')}"`).join(',')).join('\n');download(`diceduel-pro-vault-${Date.now()}.csv`,'text/csv;charset=utf-8',csv); }

  async function handleAction(target){
    const action=target.closest('[data-pro-action]')?.dataset.proAction;if(!action)return;
    const el=target.closest('[data-pro-action]');
    if(action==='close'){close();return;} if(action==='tab'){runtime.tab=el.dataset.tab;render();return;}
    if(action==='purchase-monthly'){await purchase('monthly');return;} if(action==='purchase-yearly'){await purchase('yearly');return;} if(action==='restore'){await restore();return;}
    if(action==='toggle-preview'&&isDev()){runtime.preview=!runtime.preview;applyPremiumPresentation();render();return;}
    if(!hasAccess()){runtime.tab='overview';render();return;}
    const index=number(el.dataset.index,-1);
    if(action==='export-json')exportJson(); else if(action==='export-csv')exportCsv();
    else if(action==='clear-history'&&confirm(t('confirmClear'))){data.battles=[];data.bossRushRuns=[];persist();render();}
    else if(action==='save-loadout'){const input=document.querySelector(`[data-loadout-name="${index}"]`);saveLoadout(index,input?.value);}
    else if(action==='apply-loadout')applyLoadout(index); else if(action==='clear-loadout')clearLoadout(index);
    else if(action==='set-theme')setTheme(el.dataset.value); else if(action==='set-aura')setAura(el.dataset.value);
  }

  function visible(node){ if(!(node instanceof Element))return false;const style=getComputedStyle(node);return style.display!=='none'&&style.visibility!=='hidden'&&node.getClientRects().length>0; }
  function captureFromNode(node){
    if(!(node instanceof Element)||!visible(node))return;
    const text=(node.innerText||node.textContent||'').replace(/\s+/g,' ').trim().slice(0,1200);
    if(text.length<3)return;
    const lower=text.toLowerCase();
    const victory=/\b(victory|sieg|gewonnen|erfolg)\b/.test(lower);
    const defeat=/\b(defeat|niederlage|verloren|game over)\b/.test(lower);
    const rush=/boss.?rush|run abgeschlossen|run complete/.test(lower);
    if(!victory&&!defeat&&!rush)return;
    const now=Date.now();const signature=[victory?'v':'d',rush?'r':'b',currentMode(),text.slice(0,100)].join('|');
    if(signature===runtime.lastCaptureSignature&&now-runtime.lastCaptureAt<30000)return;
    runtime.lastCaptureSignature=signature;runtime.lastCaptureAt=now;
    const stageMatch=text.match(/(?:stufe|stage)\s*(\d{1,2})/i);
    recordBattle({result:victory?'victory':defeat?'defeat':'unknown',mode:rush?'boss-rush':currentMode(),bossRushStage:stageMatch?number(stageMatch[1]):0});
  }
  function scheduleCapture(node){ clearTimeout(runtime.captureTimer);runtime.captureTimer=setTimeout(()=>captureFromNode(node),120); }
  function installCapture(){
    ['diceduel:battle-complete','dd:battle-complete','campaign:completed','diceduel:campaign-complete'].forEach(name=>window.addEventListener(name,e=>recordBattle(e.detail||{})));
    ['diceduel:bossrush-complete','bossrush:completed','dd:bossrush-complete'].forEach(name=>window.addEventListener(name,e=>recordBossRush(e.detail||{})));
    ['diceduel:battle-start','dd:battle-start'].forEach(name=>window.addEventListener(name,()=>{runtime.battleStartedAt=Date.now();}));
    if(!('MutationObserver'in window)||runtime.observer)return;
    runtime.observer=new MutationObserver(records=>{
      for(const record of records) for(const node of record.addedNodes){ if(!(node instanceof Element))continue; const likely=node.matches?.('[data-result],.victory,.defeat,.game-over,.result-screen,.battle-result,[id*="victory" i],[id*="defeat" i],[id*="result" i]')||node.querySelector?.('[data-result],.victory,.defeat,.game-over,.result-screen,.battle-result,[id*="victory" i],[id*="defeat" i],[id*="result" i]'); if(likely){scheduleCapture(likely===true?node:likely);return;} }
    });
    runtime.observer.observe(document.body,{childList:true,subtree:true});
  }

  document.addEventListener('click',event=>handleAction(event.target));
  document.addEventListener('keydown',event=>{if(event.key==='Escape'&&runtime.open)close();});
  window.addEventListener('languagechange',render);
  window.addEventListener('diceduel:language-changed',render);
  window.addEventListener('diceduel:online-payload',event=>{ if(event.detail&&typeof event.detail==='object')Object.assign(event.detail,decorateOnlinePayload(event.detail)); });

  const api=Object.freeze({
    version:VERSION, products:PRODUCT_IDS,
    hasAccess, getEntitlement:publicEntitlement, refreshEntitlement, purchase, restore,
    open, close, recordBattle, recordBossRush, getAnalytics:()=>clone(analytics()),
    getBattleHistory:()=>clone(data.battles), getBossRushHistory:()=>clone(data.bossRushRuns),
    saveLoadout, applyLoadout, clearLoadout, getLoadouts:()=>clone(data.loadouts),
    setTheme,setAura,getPublicCosmetics:publicCosmetics,decorateOnlinePayload,
    enableDevelopmentPreview(){if(!isDev())return false;runtime.preview=true;applyPremiumPresentation();render();return true;},
    disableDevelopmentPreview(){runtime.preview=false;applyPremiumPresentation();render();}
  });
  Object.defineProperty(window,'WDPro',{value:api,writable:false,configurable:false,enumerable:true});

  function init(){ensureRoot();ensureEntry();applyPremiumPresentation();installCapture();refreshEntitlement();render();emit('diceduel:pro-ready',{version:VERSION});}
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});else init();
})();
