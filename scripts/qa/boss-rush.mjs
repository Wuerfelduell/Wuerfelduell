/* Anforderungen an den Duo-Roguelike: echte Daten/Modulfunktionen im VM-Pruefstand.
   Browserablauf und Reload werden zusaetzlich mit boss-rush-browser.mjs geprueft. */
import fs from 'node:fs';
import vm from 'node:vm';
import {checkRushMastery} from './rush-mastery-contract.mjs';
import assert from 'node:assert/strict';
const elements = new Map();
const node = id => { if(!elements.has(id)) elements.set(id,{value:'',textContent:'',innerHTML:'',dataset:{},classList:{add(){},remove(){},toggle(){},contains(){return false;}},addEventListener(){},querySelector(){return null;},querySelectorAll(){return []},append(){},replaceChildren(){},setAttribute(){}}); return elements.get(id); };
const c=vm.createContext({console,window:{},document:{getElementById:node,createElement:()=>node(Math.random())},queueMicrotask:()=>{},setTimeout,clearTimeout,performance,localStorage:{getItem(){return null},setItem(){}},navigator:{}});
const files=['01-config','02-campaign-solo-data','03-campaign-duo-data','03b-campaign-trio-data','03c-campaign-endgame-data','03d-endgame-mechanics','04-save'];
vm.runInContext(files.map(f=>fs.readFileSync(`js/${f}.js`,'utf8')).join('\n'),c);
vm.runInContext(`const duoEncounterById=id=>DUO_CAMPAIGN_ENCOUNTERS.find(e=>e.id===id);`,c);
vm.runInContext(fs.readFileSync('js/37-duo-boss-rush.js','utf8').replace('  window.WDDuoBossRush=', '  window.__rushTest={setRun:r=>{run=r},getRun:()=>run,grant,perkChoicesFor,newChoices,ensurePaths,applyStageRegeneration,awardBossXp,perkSummary,showRewardModal};\n  window.WDDuoBossRush='),c);
vm.runInContext(fs.readFileSync('js/23-mastery.js','utf8').replace('  init();',''),c);
const abilitySource=fs.readFileSync('js/05-game-data-state.js','utf8');
vm.runInContext(abilitySource.slice(0,abilitySource.indexOf('  const SEATS')),c);
const rush=c.window.WDDuoBossRush;
assert.equal(rush.rewardDefinitions().length,32,'32 Perks');
const tiers=rush.stageDefinitions();
assert.equal(tiers.length,10,'10 Stufen');
for(const [i,tier] of tiers.entries()){
  assert(tier.candidates.length >= (i===9?1:3));
  for(const option of tier.candidates){
    assert(vm.runInContext(`!!duoEncounterById(${JSON.stringify(option.encounterId)})`,c));
    assert(option.enemies.length>=1 && option.enemies.length<=3);
  }
}
assert.equal(tiers[9].candidates.length,1,'fester Endboss');
for(let i=1;i<tiers.length;i++) assert(Math.min(...tiers[i].candidates.map(o=>o.pressure))>Math.max(...tiers[i-1].candidates.map(o=>o.pressure)),'Druck steigt ueber alle Pfade');
console.log('ok: 32 Perks, 10 Stufen, vorhandene Encounter, hoechstens drei Gegner, steigender Pfaddruck');

const t=c.window.__rushTest;
c.players=[];c.current=0;c.pendingExtraHealFx=[];c.recordHealing=()=>{};c.addLog=()=>{};
c.saveGameData=()=>true;c.renderPlayers=()=>{};
vm.runInContext('saveData.profiles=[{id:"a",name:"A",campaign:{bossRushXp:0}},{id:"b",name:"B",campaign:{bossRushXp:0}}];',c);
function fresh(){
 const heroes=Object.fromEntries(['a','b'].map(id=>[id,{hp:50,maxHp:50,primaryAbility:3,secondAbility:4,thirdAbility:null,perks:{},openingUsedStage:-1,bulwarkUsedStage:-1,successfulAttacks:0,stageKills:0,xpEarned:0}]));
 const run={schema:1,active:true,finished:false,phase:'combat',stage:0,cleared:0,preparedStage:0,profileIds:['a','b'],heroes,rewardHistory:[],bossXpAwards:[],paths:[],selectedPaths:[],seenEncounters:[],deferredRewards:[],rewardTasks:[],rewardTurn:0,swapPending:null,bossXpEarned:0};
 c.players=[{profileId:'a',campaignTeam:'hero',hp:50,maxHp:50,ability:3,secondAbility:4},{profileId:'b',campaignTeam:'hero',hp:50,maxHp:50,ability:3,secondAbility:4},{campaignTeam:'enemy',hp:50,maxHp:50}];c.current=0;t.setRun(run);return run;
}
let r=fresh();r.heroes.a.perks={damage:1,opening:1,execution:1,revenge:1,sacrifice:1,momentum:1,drill:1,gamble:1};r.cleared=2;r.heroes.a.successfulAttacks=2;c.players[0].hp=11;c.players[1].hp=0;c.players[2].hp=14;
assert.equal(rush.attackDamageBonus(0,2).amount,28);
assert.equal(rush.attackDamageBonus(0,2).amount,25,'Eröffnung nur einmal je Boss');
r=fresh();r.heroes.a.perks={execution:2,sacrifice:2};c.players[0].hp=25;c.players[2].hp=15;assert.equal(rush.attackDamageBonus(0,2).amount,0,'strikte HP-Schwellen');
c.players[0].hp=12.5;assert.equal(rush.attackDamageBonus(0,2).amount,4);
c.players[0].hp=12;assert.equal(rush.attackDamageBonus(0,2).amount,8);
r=fresh();r.heroes.a.perks={drill:1};rush.afterHeroAttack(0,0);assert.equal(r.heroes.a.successfulAttacks,0);rush.afterHeroAttack(0,1);rush.afterHeroAttack(0,1);r.stage=1;assert.equal(rush.attackDamageBonus(0,2).amount,6,'Angriffszähler läuft über Bossgrenzen');rush.afterHeroAttack(0,1);assert.equal(rush.attackDamageBonus(0,2).amount,0);
r=fresh();r.heroes.a.perks={relay:2};r.lastAttacker='b';assert.equal(rush.attackDamageBonus(0,2).amount,4);c.players[1].hp=0;assert.equal(rush.attackDamageBonus(0,2).amount,0);
r=fresh();r.heroes.a.perks={scales:2,bulwark:2,dodge:2};c.players[0].hp=10;c.current=2;assert.equal(rush.incomingDamageModifier(0,10),-10);assert.equal(rush.incomingDamageModifier(0,10),-6);r.stage++;assert.equal(rush.incomingDamageModifier(0,10),-10);c.current=0;assert.equal(rush.incomingDamageModifier(0,10),0,'keine Reduktion eigener Aktionen');
r=fresh();r.heroes.a.perks={hospital:2,blood_pact:20};r.heroes.b.perks={hospital:1};r.heroes.a.hp=1;r.heroes.b.hp=0;t.applyStageRegeneration();assert.equal(r.heroes.a.hp,1);assert.equal(r.heroes.b.hp,24);
r=fresh();r.heroes.a.hp=0;r.heroes.a.perks={second_wind:2};assert.equal(rush.startingVitals({id:'a'},100).hp,15);assert.equal(r.heroes.a.maxHp,50,'max. HP werden beim Stufenwechsel nicht zurückgesetzt');
r=fresh();for(let i=0;i<20;i++)assert(t.grant('a','gamble'));assert.equal(r.heroes.a.maxHp,10);assert.equal(r.heroes.a.perks.gamble,20);t.grant('a','constitution');assert.equal(r.heroes.a.maxHp,20);assert.equal(r.heroes.a.hp,20);t.grant('a','blood_pact');assert.equal(r.heroes.a.hp,45);
r=fresh();r.heroes.a.thirdAbility=9;assert.equal(t.grant('a','realign',{slot:'fourthAbility'}),false);assert(t.grant('a','realign',{slot:'secondAbility'}));assert(![3,4,9].includes(r.heroes.a.secondAbility));assert.equal(r.heroes.a.perks.realign,1);
r=fresh();for(const difficulty of ['easy','normal','hard'])for(let i=0;i<100;i++){r.selectedPaths[0]={difficulty};const options=Array.from(t.newChoices('a',3));assert.equal(options.length,difficulty==='hard'?4:3);const perks=options.filter(id=>!id.startsWith('ability:')).map(id=>rush.rewardDefinitions().find(r=>r.id===id));if(difficulty==='easy')assert(perks.every(p=>p.rarity==='common'));else assert(perks.some(p=>p.rarity===(difficulty==='hard'?'epic':'rare')));}
r=fresh();r.selectedPaths[0]={difficulty:'normal'};r.heroes.a.perks={supply:2};t.showRewardModal();assert.equal(r.rewardTasks[0].choices.length,4);assert.equal(r.heroes.a.suppliesUsed,1);r.rewardTasks=[];t.showRewardModal();assert.equal(r.heroes.a.suppliesUsed,2);r.rewardTasks=[];t.showRewardModal();assert.equal(r.rewardTasks[0].choices.length,3);
// Zweitfund: zwei Stufen Laufzeit, je Stufe genau eine Kopie, ein erneuter Fund verlaengert.
r=fresh();t.grant('a','second_find');assert.equal(r.deferredRewards.length,0,'der Fund selbst kopiert nichts');
assert.equal(r.heroes.a.secondFindLeft,2,'zwei Stufen Laufzeit');
t.grant('a','rest');assert.equal(r.deferredRewards.length,1);assert.equal(r.heroes.a.secondFindLeft,1);
assert(r.deferredRewards.every(x=>x.profileId==='b'&&x.dueStage===1));
t.grant('a','damage');assert.equal(r.deferredRewards.length,2);assert.equal(r.heroes.a.secondFindLeft,0);
t.grant('a','damage');assert.equal(r.deferredRewards.length,2,'nach zwei Stufen ist Schluss');
t.grant('a','second_find');assert.equal(r.heroes.a.secondFindLeft,2,'ein erneuter Fund verlaengert');
// Je Stufe nimmt ein Held hoechstens eine Kopie an; der Rest rueckt nach.
r.stage=1;r.selectedPaths[1]={difficulty:'easy'};t.showRewardModal();
assert.equal(r.rewardTasks.filter(t=>t.copy).length,1,'hoechstens eine Kopie je Stufe');
assert.equal(r.deferredRewards.length,1,'die zweite rueckt eine Stufe nach');
assert.equal(r.deferredRewards[0].dueStage,2);
t.grant('b','rest',{copyReward:true});assert.equal(r.deferredRewards.length,1,'Kopien erzeugen keine Kopierkette');
r=fresh();r.heroes.a.perks={greed:2,plunder:1};r.heroes.a.stageKills=2;t.awardBossXp();assert.equal(r.bossXpAwards[0].amount,140);assert.equal(r.bossXpAwards[1].amount,50);
r=fresh();for(const reward of rush.rewardDefinitions()){if(['realign','refinement','mastery'].includes(reward.id))t.grant('a',reward.id,{slot:'primaryAbility'});else t.grant('a',reward.id);}assert.equal(Object.keys(r.heroes.a.perks).length,32);assert(rush.rewardDefinitions().every(reward=>t.perkSummary('a').includes(reward.name)));assert.equal(r.rewardHistory.filter(h=>h.profileId==='a').length,32);
const sanitized=c.sanitizeBossRushRuns({x:r,bad:{schema:1,profileIds:['a','a']}},[{id:'a'},{id:'b'}]);assert.equal(Object.keys(sanitized).length,1);r.finished=true;assert.equal(Object.keys(c.sanitizeBossRushRuns({x:r},[{id:'a'},{id:'b'}])).length,0);
console.log('ok: Schadensperks und Schwellen, Stapel, Heilung, Verteidigung, Slots, Seltenheiten, Vorratspaket, Zweitfund, XP, alle 32 Historieneinträge, Save-Bereinigung');

checkRushMastery({c,t,rush:rush,fresh,mode:'duo'});
