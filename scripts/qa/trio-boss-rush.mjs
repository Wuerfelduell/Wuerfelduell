/* Portierungsvertrag: vorhandene Encounter vollständig, gleiche Perks und drei Helden. */
import fs from 'node:fs';
import vm from 'node:vm';
import {checkRushMastery} from './rush-mastery-contract.mjs';
import assert from 'node:assert/strict';
assert(fs.existsSync('js/44-trio-boss-rush.js'),'Trio-Modul fehlt');
const elements=new Map();
const node=id=>{if(!elements.has(id))elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{add(){},remove(){},toggle(){}},addEventListener(){},replaceChildren(){},querySelector(){return null},querySelectorAll(){return []},setAttribute(){}});return elements.get(id);};
const c=vm.createContext({console,window:{},document:{getElementById:node},queueMicrotask:()=>{},performance,localStorage:{getItem(){return null},setItem(){}},navigator:{}});
for(const f of ['01-config','02-campaign-solo-data','03-campaign-duo-data','03b-campaign-trio-data','03c-campaign-endgame-data','03d-endgame-mechanics','04-save'])vm.runInContext(fs.readFileSync(`js/${f}.js`,'utf8'),c);
vm.runInContext('const duoEncounterById=id=>DUO_CAMPAIGN_ENCOUNTERS.find(e=>e.id===id); const trioEncounterById=id=>TRIO_CAMPAIGN_ENCOUNTERS.find(e=>e.id===id);',c);
vm.runInContext(fs.readFileSync('js/37-duo-boss-rush.js','utf8'),c);
vm.runInContext(fs.readFileSync('js/44-trio-boss-rush.js','utf8').replace('  window.WDTrioBossRush=','  window.__trioTest={setRun:r=>run=r,grant,newChoices,showRewardModal,applyStageRegeneration,perkSummary,awardBossXp,ensurePaths,validStored};\n  window.WDTrioBossRush='),c);
vm.runInContext(fs.readFileSync('js/23-mastery.js','utf8').replace('  init();',''),c);
const abilitySource=fs.readFileSync('js/05-game-data-state.js','utf8');vm.runInContext(abilitySource.slice(0,abilitySource.indexOf('  const SEATS')),c);
const trio=c.window.WDTrioBossRush,duo=c.window.WDDuoBossRush,t=c.window.__trioTest;
const plain=v=>JSON.parse(JSON.stringify(v));
assert.deepEqual(Object.keys(trio).sort(),Object.keys(duo).sort(),'identische Schnittstellen');
assert.deepEqual(plain(trio.rewardDefinitions().map(({id,rarity})=>({id,rarity}))),plain(duo.rewardDefinitions().map(({id,rarity})=>({id,rarity}))));
const stages=trio.stageDefinitions();assert.equal(stages.length,15);assert.equal(stages[14].candidates.length,1);
assert.equal(stages[14].candidates[0].encounterId,'trio_helix_apex');
const seen=new Set();
for(const [i,s] of stages.entries()){
 const ids=new Set(s.candidates.map(o=>o.encounterId));assert(ids.size>=(i===14?1:3));
 for(const id of ids){assert(!seen.has(id));seen.add(id);}
 for(const option of s.candidates){const source=vm.runInContext(`trioEncounterById(${JSON.stringify(option.encounterId)})`,c);assert(source);const boss=vm.runInContext(`(()=>{const e=trioEncounterById(${JSON.stringify(option.encounterId)});return !!(e.isBoss||e.isMiniBoss||[4,9,14].includes(TRIO_CAMPAIGN_ENCOUNTERS.filter(x=>x.world===e.world).indexOf(e)));})()`,c);assert.equal(boss,[4,9,14].includes(i),'Bosse nur auf Stufe 5, 10 und 15');assert.deepEqual(plain(option.enemies.map(e=>e.name)),plain(source.enemies.map(e=>e.name)),'vollständige Gegnergruppe');assert(option.enemies.every(e=>Number.isInteger(e.hp)&&e.hp>0));assert.equal(option.pressure,option.enemies.reduce((n,e)=>n+e.hp,0)*(1+.25*(option.enemies.length-1)));}
 if(i)assert(Math.min(...s.candidates.map(o=>o.pressure))>Math.max(...stages[i-1].candidates.map(o=>o.pressure)));
}
assert.equal(seen.size,vm.runInContext('TRIO_CAMPAIGN_ENCOUNTERS.length',c));
assert.equal(stages[14].candidates[0].enemies.length,4,'Helix Apex samt drei Seals');
c.players=[];c.current=0;c.pendingExtraHealFx=[];c.recordHealing=()=>{};c.addLog=()=>{};c.renderPlayers=()=>{};c.saveGameData=()=>true;
vm.runInContext('saveData.profiles=["a","b","c"].map(id=>({id,name:id,campaign:{bossRushXp:100}}));',c);
function fresh(){const ids=['a','b','c'];const r={schema:1,stageCount:15,active:true,finished:false,phase:'combat',stage:0,cleared:0,preparedStage:0,profileIds:ids,heroes:Object.fromEntries(ids.map(id=>[id,{hp:50,maxHp:50,primaryAbility:3,secondAbility:4,thirdAbility:null,perks:{},openingUsedStage:-1,bulwarkUsedStage:-1,successfulAttacks:0,stageKills:0,xpEarned:0}])),rewardHistory:[],bossXpAwards:[],paths:[],selectedPaths:[],seenEncounters:[],deferredRewards:[],rewardTasks:[],rewardTurn:0,swapPending:null,bossXpEarned:0};c.players=ids.map(id=>({profileId:id,campaignTeam:'hero',hp:50,maxHp:50,ability:3,secondAbility:4}));c.players.push({campaignTeam:'enemy',hp:50,maxHp:50});c.current=0;t.setRun(r);return r;}
let r=fresh();r.heroes.b.perks={hospital:2};r.heroes.c.perks={hospital:1};t.applyStageRegeneration();assert.deepEqual(r.profileIds.map(id=>r.heroes[id].hp),[74,74,74]);
// Zweitfund gibt auch bei drei Helden je Stufe genau eine Kopie ab, und zwar
// abwechselnd - sonst sammelte ein Held ein Vielfaches der zehn Belohnungen.
r=fresh();t.grant('a','second_find');assert.equal(r.deferredRewards.length,0);
assert.equal(r.heroes.a.secondFindLeft,2);
t.grant('a','rest');assert.equal(r.deferredRewards.length,1,'nicht an beide Mitspieler');
const ersterEmpfaenger=r.deferredRewards[0].profileId;
assert(['b','c'].includes(ersterEmpfaenger));assert.equal(r.deferredRewards[0].dueStage,1);
r.rewardHistory.push({stage:1,profileId:ersterEmpfaenger,rewardId:'rest',copy:true});
t.grant('a','damage');assert.equal(r.deferredRewards.length,2);
assert.notEqual(r.deferredRewards[1].profileId,ersterEmpfaenger,'der andere Mitspieler ist dran');
assert.equal(r.heroes.a.secondFindLeft,0,'nach zwei Stufen ist Schluss');
r.stage=1;r.selectedPaths[1]={difficulty:'easy'};t.showRewardModal();
// Zwei Kopien an zwei verschiedene Helden - je Held immer noch nur eine.
assert.equal(r.rewardTasks.filter(x=>x.copy).length,2);
assert.equal(new Set(r.rewardTasks.filter(x=>x.copy).map(x=>x.profileId)).size,2);
assert.deepEqual(plain(r.rewardTasks.filter(x=>!x.copy).map(x=>x.profileId)),['a','b','c']);
t.grant('b','rest',{copyReward:true});assert.equal(r.deferredRewards.length,0);
r=fresh();r.heroes.a.perks={relay:2};for(const id of ['b','c']){r.lastAttacker=id;assert.equal(trio.attackDamageBonus(0,3).amount,4);}c.players[2].hp=0;assert.equal(trio.attackDamageBonus(0,3).amount,0);
r=fresh();r.heroes.c.perks={scales:2,bulwark:2,dodge:2};c.players[2].hp=10;c.current=3;assert.equal(trio.incomingDamageModifier(2,10),-10);assert.equal(trio.incomingDamageModifier(2,10),-6);
r=fresh();r.heroes.c.perks={revenge:2};c.players[0].hp=0;c.players[1].hp=0;assert.equal(trio.attackDamageBonus(2,3).amount,12);
r=fresh();for(const difficulty of ['easy','normal','hard'])for(let i=0;i<30;i++){r.selectedPaths[0]={difficulty};const options=t.newChoices('c',3);assert.equal(options.length,difficulty==='hard'?4:3);const perks=options.filter(id=>!id.startsWith('ability:')).map(id=>trio.rewardDefinitions().find(x=>x.id===id));if(difficulty==='easy')assert(perks.every(p=>p.rarity==='common'));else assert(perks.some(p=>p.rarity===(difficulty==='normal'?'rare':'epic')));}
r=fresh();for(const reward of trio.rewardDefinitions())assert(t.grant('c',reward.id,['realign','refinement','mastery'].includes(reward.id)?{slot:'primaryAbility'}:{}));assert.equal(Object.keys(r.heroes.c.perks).length,32);assert.equal(r.rewardHistory.length,32);assert(trio.rewardDefinitions().every(x=>t.perkSummary('c').includes(x.name)));
r=fresh();r.heroes.c.perks={greed:1};t.awardBossXp();assert.deepEqual(r.bossXpAwards.map(x=>x.amount),[50,50,75]);assert.equal(vm.runInContext('saveData.profiles[2].campaign.bossRushXp',c),175);
const clean=c.sanitizeBossRushRuns({x:r},[{id:'a'},{id:'b'},{id:'c'}],3);assert.equal(Object.keys(clean).length,1);assert.equal(Object.keys(c.sanitizeBossRushRuns({x:r},[{id:'a'},{id:'b'},{id:'c'}])).length,0);r.finished=true;assert.equal(Object.keys(c.sanitizeBossRushRuns({x:r},[{id:'a'},{id:'b'},{id:'c'}],3)).length,0);
console.log(`ok: Trio-Portierungsvertrag, ${seen.size} vollständige Encounter, 15 steigende Stufen, 32 identische Perks, Teamhaken für drei Profile, Zweitfund, XP und Speicherbereinigung`);

checkRushMastery({c,t,rush:trio,fresh,mode:'trio'});

assert(Math.min(...stages[9].candidates.map(o=>o.pressure))>1.35*Math.max(...stages[8].candidates.map(o=>o.pressure)),'Ultra-Sprung ab Stufe 10');
for(let i=9;i<15;i++)assert(stages[i].candidates.every(o=>o.phaseHeal>=12+4*(i-9)),'Ultra-Phasenheilung steigt');
for(let attempt=0;attempt<50;attempt++){
 const r=fresh();
 for(let stage=0;stage<15;stage++){r.stage=stage;t.ensurePaths();assert.equal(r.paths[stage].length,stage===14?1:3);}
 const draws=r.paths.flat().map(o=>o.encounterId);assert.equal(new Set(draws).size,draws.length,'kein wiederholtes Angebot');
}
const legacy=JSON.parse(fs.readFileSync('scripts/qa/fixtures/trio-rush-v28.12.3.json','utf8'));
const legacyClean=Object.values(c.sanitizeBossRushRuns({x:legacy},[{id:'a'},{id:'b'},{id:'c'}],3))[0];
assert.equal(legacyClean.stageCount,10);assert(t.validStored(legacyClean,['a','b','c']),'echter Zehner-Spielstand bleibt gültig');
t.setRun(legacyClean);assert.equal(trio.currentEncounter().title.split(' · ')[0],'Boss Rush 10/10');
assert.equal(trio.abilityLevelOverride('a',3),1);
const late=fresh();late.stage=14;t.ensurePaths();late.selectedPaths[14]=plain(late.paths[14][0]);late.cleared=14;
const lateClean=Object.values(c.sanitizeBossRushRuns({x:late},[{id:'a'},{id:'b'},{id:'c'}],3))[0];assert(t.validStored(lateClean,['a','b','c']));
late.stage=15;assert.equal(Object.keys(c.sanitizeBossRushRuns({x:late},[{id:'a'},{id:'b'},{id:'c'}],3)).length,0);
console.log('ok: Ultra ab 10, 50 vollständige Pfadziehungen ohne Wiederholung, alte Zehner-Runs und neue Stufe 15 gespeichert');

r=fresh();r.stage=11;t.grant('a','second_find');t.grant('a','rest');assert.equal(r.deferredRewards[0].dueStage,12,'Zweitfund wirkt auch nach Stufe 10');
