import assert from 'node:assert/strict';
import vm from 'node:vm';
import fs from 'node:fs';

// Derselbe Vertrag für beide Module, mit der echten Mastery und Save-Bereinigung.
export function checkRushMastery({c,t,rush,fresh,mode}){
 const m=c.window.WDMastery;
 c.window.WDBossRush=rush;c.campaignMode=true;c.duoCampaignMode=mode==='duo';c.trioCampaignMode=mode==='trio';
 c.currentEncounterObject=()=>({world:'fracture'});
 const profiles=vm.runInContext('saveData.profiles',c);
 profiles.forEach(p=>{m.ensureModes(p);m.ensureModes(p);m.ensure(p,mode).abilityL2Progress={3:7};});
 const before=JSON.stringify(profiles.map(p=>p.campaign.masteryModes));
 let r=fresh();r.selectedPaths[0]={difficulty:'hard'};
 assert(t.grant('a','refinement',{slot:'primaryAbility'}));
 assert.equal(rush.abilityLevelOverride('a',3),1);
 assert.equal(m.abilityLevelForPlayer(3,0),1);
 assert.equal(t.grant('a','refinement',{slot:'primaryAbility'}),false);
 assert(t.grant('a','mastery',{slot:'primaryAbility'}));
 assert(m.hasAbilityUpgrade(3,1,0));assert(m.hasAbilityUpgrade(3,2,0));
 assert.equal(m.abilityLevel(profiles[0],mode,3),0);
 m.addL2Progress(0,3,'mustNotProgress',12);m.unlockL2ForPlayer(0,3);
 assert.equal(m.l2TrackingContext(0,3),null);
 assert.equal(t.grant('a','mastery',{slot:'thirdAbility'}),false,'kein leerer Slot');
 assert(t.grant('a','mastery',{slot:'secondAbility'}),'0 direkt auf 2');
 for(let i=0;i<100;i++)assert(t.newChoices('a',32).every(id=>!['refinement','mastery'].includes(id)),'nutzlose Perks fehlen');
 const clean=c.sanitizeBossRushRuns({x:r},profiles,r.profileIds.length);
 t.setRun(JSON.parse(JSON.stringify(Object.values(clean)[0])));
 assert.equal(rush.abilityLevelOverride('a',3),2,'Save/Reload');
 assert.equal(rush.abilityLevelOverride('a',4),2);
 assert(t.grant('a','realign',{slot:'primaryAbility'}));
 assert.equal(rush.abilityLevelOverride('a',3),0,'weggetauschte Fähigkeit inaktiv');
 assert.equal(Object.values(clean)[0].abilityLevelOverrides.a[3],2,'Eintrag bleibt gespeichert');
 r=fresh();const state=m.ensure(profiles[0],mode);state.abilityLevels={3:2,4:1};
 assert(m.l2TrackingContext(0,3),'Kontrollfall: echte Profil-Mastery erfüllt den L2-Haken');
 r.selectedPaths[0]={difficulty:'hard'};
 for(let i=0;i<50;i++)assert(!t.newChoices('a',32).includes('refinement'));
 assert.equal(t.grant('a','mastery',{slot:'primaryAbility'}),false,'Profil-Level 2 berücksichtigt');
 assert(t.grant('a','mastery',{slot:'secondAbility'}));
 state.abilityLevels={};
 r.finished=true;assert.equal(rush.abilityLevelOverride('a',4),0,'nach Run-Ende restlos weg');
 assert.equal(JSON.stringify(profiles.map(p=>p.campaign.masteryModes)),before,'Profil einschließlich L2 unverändert');
 r=fresh();r.phase='reward';r.selectedPaths[0]={difficulty:'hard'};
 r.abilityLevelOverrides={a:{3:2,4:2}};
 r.deferredRewards=[{profileId:'a',dueStage:0,rewardId:'mastery'}];
 t.showRewardModal();
 assert.equal(r.rewardTurn,1,'wirkungsloser Zweitfund übersprungen');
 assert(r.rewardTasks[1].choices.every(id=>!['refinement','mastery'].includes(id)));
 const invalid=JSON.parse(JSON.stringify(r));invalid.abilityLevelOverrides={a:{3:9,4:1,6:2},stranger:{3:2}};
 const sanitized=Object.values(c.sanitizeBossRushRuns({x:invalid},profiles,r.profileIds.length))[0];
 assert.deepEqual(JSON.parse(JSON.stringify(sanitized.abilityLevelOverrides.a)),{4:1},'nur gültige IDs und Stufen');
 assert(!sanitized.abilityLevelOverrides.stranger);
 for(const file of ['lang/en.js','lang/en-campaign.js'])vm.runInContext(fs.readFileSync(file,'utf8'),c);
 for(const id of vm.runInContext('REAL_ABILITY_IDS',c))for(const level of [1,2]){
   const detail=m.abilityUpgrade(id,level);assert(detail?.name&&detail?.text,`${id}/L${level}`);
   assert(Object.isFrozen(detail),'Lesezugriff unveränderlich');
   assert(c.window.WD_LANG_PACKS.en.exact[detail.text],`englischer Upgrade-Text ${id}/L${level}`);
 }
 console.log(`ok: ${mode} Mastery-Filter, beide Zielschritte, 0→2, Save/Reload, Profil/L2 unverändert, Run-Ende und alle Upgrade-Texte`);
}
