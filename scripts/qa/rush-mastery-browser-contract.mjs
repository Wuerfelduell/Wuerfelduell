import assert from 'node:assert/strict';

export async function checkRushMasteryBrowser({p,ids,mode,open,win,pause,snap}){
 const trio=mode==='trio',qa=trio?'__trioQA':'__rushQA',module=trio?'WDTrioBossRush':'WDDuoBossRush';
 await p.evaluate(trio=>trio?returnToTrioCampaignMap():returnToDuoCampaignMap(),trio);
 await open(ids);
 if(await p.locator('[data-rush-resume="no"]').count()){await p.click('[data-rush-resume="no"]');await pause();}
 await p.click('[data-rush-path="2"]');await pause();
 const before=await p.evaluate(({qa,mode})=>{
   const r=window[qa].getRun();
   r.profileIds.forEach((id,i)=>{
     const profile=getProfile(id);window.WDMastery.ensureModes(profile);window.WDMastery.ensureModes(profile);
     const m=window.WDMastery.ensure(profile,mode);m.abilityLevels=i?{}:{18:1,7:2};
     m.abilityL2Progress={4:11};m.abilityL2Unlocked={};
     const hero=r.heroes[id],player=players.find(p=>p.profileId===id);
     Object.assign(hero,{primaryAbility:4,secondAbility:i?25:18,thirdAbility:7});
     Object.assign(player,{ability:4,secondAbility:hero.secondAbility,thirdAbility:7});
   });
   window[qa].persistRun();return r.profileIds.map(id=>getProfile(id).campaign.masteryModes);
 },{qa,mode});
 await win();
 await p.evaluate(qa=>{
   const q=window[qa],r=q.getRun();
   r.rewardTasks=[{profileId:r.profileIds[0],count:3,choices:['refinement','mastery','damage']},
     {profileId:r.profileIds[0],count:3,choices:['mastery','damage','rest']},
     {profileId:r.profileIds[1],count:3,choices:['mastery','damage','rest']},
     ...r.profileIds.slice(2).map(profileId=>({profileId,count:1,choices:['rest']}))];
   r.rewardTurn=0;q.persistRun();q.renderRewardTurn();
 },qa);
 for(const [turn,rewardId,level] of [[0,'refinement',1],[1,'mastery',2],[2,'mastery',2]]){
   await p.evaluate(rewardId=>{const b=document.querySelector(`[data-boss-rush-reward="${rewardId}"]`);b.click();b.click();},rewardId);
   await pause();assert.equal((await snap()).rewardTurn,turn,'Doppelklick vergibt keinen Perk');
   assert.equal(await p.locator('[data-rush-slot]').count(),turn===0?1:turn===1?2:3,'nur wirksame belegte Slots');
   await p.reload();await open(ids);await p.click('[data-rush-resume="yes"]');await pause();
   assert.equal((await snap()).swapPending.rewardId,rewardId,'Zielschritt überlebt Reload');
   const text=await p.locator('[data-rush-slot="primaryAbility"]').innerText();
   assert(text.includes(turn===0?'One More Try':'Reroll for Damage'));
   if(turn===2)assert(text.includes('One More Try'),'0→2 zeigt beide Upgrades');
   if(turn===2){
     for(const language of ['de','en']){
       await p.evaluate(language=>localStorage.setItem('diceduel_language',language),language);
       await p.reload();await open(ids);await p.click('[data-rush-resume="yes"]');await pause();
       const translated=await p.locator('[data-rush-slot="primaryAbility"]').innerText();
       assert(translated.includes(language==='de'?'Second Chance darf 2-mal':'Second Chance can be used twice'));
       for(const width of [320,360,390,412,1280]){
         await p.setViewportSize({width,height:900});
         await p.locator('[data-rush-slot]').last().scrollIntoViewIfNeeded();
         assert(await p.locator('[data-rush-slot]').evaluateAll(nodes=>nodes.every(e=>e.scrollWidth<=e.clientWidth+1)),`${mode}/${language}/${width}`);
       }
     }
     await p.setViewportSize({width:390,height:844});
     await p.locator('[data-rush-slot]').first().scrollIntoViewIfNeeded();
     await p.screenshot({path:`/tmp/${mode}-rush-mastery.png`});
   }
   await p.evaluate(()=>{const b=document.querySelector('[data-rush-slot="primaryAbility"]');b.click();b.click();});await pause();
   const id=ids[turn===2?1:0];assert.equal((await snap()).abilityLevelOverrides[id][4],level);
   assert.equal((await snap()).rewardHistory.filter(h=>h.rewardId===rewardId).length,rewardId==='mastery'?turn:1);
   await p.reload();await open(ids);await p.click('[data-rush-resume="yes"]');await pause();
   assert.equal((await snap()).abilityLevelOverrides[id][4],level,'gewähltes Upgrade überlebt Reload');
 }
 while((await snap()).phase==='reward'){await p.locator('[data-boss-rush-reward]').first().click();await pause();}
 await p.click('[data-rush-path="0"]');await pause();
 const levels=await p.evaluate(({qa,module})=>{
   const r=window[qa].getRun(),m=window.WDMastery;
   return r.profileIds.slice(0,2).map(id=>{const index=players.findIndex(p=>p.profileId===id);
     m.addL2Progress(index,4,'mustNotProgress',50);m.unlockL2ForPlayer(index,4);
     return [m.abilityLevelForPlayer(4,index),m.hasAbilityUpgrade(4,1,index),m.hasAbilityUpgrade(4,2,index),window[module].abilityLevelOverride(id,7)];});
 },{qa,module});assert.deepEqual(levels,[[2,true,true,0],[2,true,true,0]]);
 await p.evaluate(module=>{players.filter(p=>p.campaignTeam==='hero').forEach(p=>p.hp=0);window[module].finishEncounter(false);},module);
 assert.deepEqual(await p.evaluate(ids=>ids.map(id=>getProfile(id).campaign.masteryModes),ids),before,'Profil und L2 nach Lauf exakt unverändert');
 assert.equal(await p.evaluate(({module,id})=>window[module].abilityLevelOverride(id,4),{module,id:ids[0]}),0);
 assert.equal(await p.evaluate(trio=>Object.keys(trio?saveData.trioBossRushRuns:saveData.bossRushRuns).some(key=>key===JSON.stringify([...window[trio?'WDTrioBossRush':'WDDuoBossRush'].snapshot().profileIds].sort())),trio),false);
 console.log(`ok: ${mode} Feinschliff/Meisterschaft: Zielauswahl, Doppelklickschutz, Reload vor/nach Wahl, 0→2, DE/EN in fünf Breiten, Profil/L2 nach Run unverändert`);
}
