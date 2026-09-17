// Reiner Duell-Zustand. Auswahl und Zufall liefert später der Aktionsadapter.
(function(root){
  'use strict';
  const engine=root.WDEngine;
  if(!engine?.definitions) throw new Error('WDEngine.definitions muss vor dem Zustand geladen werden');
  const definitions=engine.definitions;
  const own=(value,key)=>Object.prototype.hasOwnProperty.call(value,key);
  const integer=(min=0,max=Number.MAX_SAFE_INTEGER)=>({kind:'integer',min,max});
  const choice=(...values)=>({kind:'choice',values});
  const nullable=schema=>({kind:'nullable',schema});
  const list=(schema,min=0,max=Number.MAX_SAFE_INTEGER,unique=false)=>({kind:'list',schema,min,max,unique});
  const record=(fields,optional=[])=>({kind:'record',fields,optional});
  const flag=choice(false,true), count=integer(), seat=integer(0,5);
  const dieFace=integer(1,6), index=integer(0,definitions.DICE_COUNT-1);
  const ability=choice(...definitions.REAL_ABILITY_IDS);
  const phases=choice('idle','base_select','base_ready','gamble_attack','gamble_retry_offer',
    'gamble_retry','perfect25','perfect25_d4','insurance','attack_ready','attack_after_roll',
    'attack_target','attack_continue','high_stakes','counterattack','draft_pending','turn_done',
    'resolving','finished','round_preparation');
  const decisionSchema=record({
    kind:choice('roll_base','select_base','roll_attack','resolve_attack','gambling','gambling_retry_offer',
      'gambling_retry','perfect25','perfect25_d4','insurance','high_stakes','counterattack',
      'choose_attack_target','choose_ability','end_turn','prepare_round','choose_start_abilities','start_round'),
    seat
  });
  const rngSchema=record({algorithm:choice('external','mulberry32'),seed:nullable(integer(0,0xffffffff)),
    state:nullable(integer(0,0xffffffff)),drawIndex:count});
  const setupSchema=record({modeId:choice(...Object.keys(definitions.LOCAL_MODES)),
    players:list(record({seat,abilities:list(ability,1,3,true)}),2,6),
    startingSeat:seat,roundNumber:integer(1),rng:rngSchema},['startingSeat','roundNumber','rng']);
  const diceSchema=list(record({value:nullable(dieFace),locked:flag,selected:flag}),definitions.DICE_COUNT,definitions.DICE_COUNT);
  const effectsSchema=record({momentumStreak:count,lastStandUsed:flag,lastStandCooldown:integer(0,3),
    damageSinceLastOwnTurn:flag,bloodRushPrimed:flag,voluntaryHpPaidThisTurn:flag,
    selfDamageSinceLastOwnTurn:flag,underdogTurnActive:flag,poisonTurns:integer(0,2),
    poisonSourceSeat:nullable(seat),healEffectCount:count,snakeEyesUsesThisTurn:count});
  const draftEntrySchema=record({seat,slot:integer(2,3),choices:list(ability,2,2,true),trigger:choice('hp','kill')});
  // Die Warteschlange zieht noch keine Auswahl; erst das tatsächliche Öffnen
  // verbraucht Zufall. So bleibt die Reihenfolge aufeinanderfolgender Drafts erhalten.
  const draftQueueSchema=record({seat,slot:integer(2,3),trigger:choice('hp','kill')});
  const counterContextSchema=record({defenderSeat:seat,attackerSeat:seat,restoreHp:nullable(integer(1)),
    incomingDamage:count,lastStandTriggered:flag,bloodRushActive:flag});
  const stateSchema=record({
    ruleVersion:choice(definitions.RULE_VERSION),stateVersion:choice(definitions.STATE_VERSION),
    modeId:choice(...Object.keys(definitions.LOCAL_MODES)),masteryLevel:choice(0,2),
    sequence:record({action:count,event:count}),
    players:list(record({seat,hp:count,maxHp:integer(1),abilities:list(ability,1,3,true),
      bonusAbilityUnlocked:flag,roundsWon:count,effects:effectsSchema}),2,6),
    turn:record({number:integer(1),currentSeat:seat,phase:phases,decision:nullable(decisionSchema)}),
    dice:diceSchema,
    base:record({rerollUsed:flag,luckRerollIndex:nullable(index),luckRerollSecondUsed:flag,luckRerollUses:integer(0,2),
      loadedDiceUsed:flag,loadedDiceUses:integer(0,2),lastRollIndices:list(index,0,definitions.DICE_COUNT,true)}),
    attack:record({face:nullable(dieFace),targetSeat:nullable(seat),hits:integer(0,definitions.DICE_COUNT),damage:count,
      firstRoll:flag,currentRollNewHits:integer(0,definitions.DICE_COUNT),rollCount:count,masteryRollCount:count,
      normalHits:integer(0,definitions.DICE_COUNT),exactFaceHits:integer(0,definitions.DICE_COUNT),
      wildcardHits:integer(0,definitions.DICE_COUNT),lastRollIndices:list(index,0,definitions.DICE_COUNT,true),
      powerUsed:flag,powerUses:integer(0,2),precisionUses:integer(0,3),momentumBonus:integer(0,3),
      bloodPriceNeighbors:list(dieFace,0,2,true),bloodPricePaidThisRoll:count,bloodPriceWasPreActivatedThisRoll:flag,
      bloodRushActive:flag,doubleTapApplied:flag,wildcardFace:nullable(dieFace),wildcardSecondRollArmed:flag,
      wildcardTriggered:flag,masteryL2BonusesApplied:flag,source:choice('normal','advance','gambling','perfect25'),
      baseTotal:nullable(integer(5,30))}),
    counter:record({context:nullable(counterContextSchema),pending:nullable(counterContextSchema),
      dice:diceSchema,hits:integer(0,definitions.DICE_COUNT),firstRoll:flag}),
    draft:record({active:nullable(draftEntrySchema),queue:list(draftQueueSchema,0,6),
      continuation:nullable(choice('finish_base','finish_attack','start_counter','start_perfect25'))}),
    special:record({gambling:record({baseTotal:nullable(integer(5,30)),retryUsed:flag,retryPending:flag}),
      perfect25:record({baseTotal:nullable(integer(5,30)),pendingTotal:nullable(integer(5,30))}),
      highStakes:record({decisionMade:flag,rawDamage:nullable(count)}),
      insurance:nullable(record({total:integer(5,30),rawDamage:count,afterMode:choice('finish','perfect25','advance24')}))}),
    round:record({number:integer(1),eliminationOrder:list(seat,0,6,true),lastPlaceSeat:nullable(seat),
      winnerSeat:nullable(seat),result:nullable(record({winnerSeat:nullable(seat),reason:choice('last_alive','draw')})),
      preparation:list(record({seat,roll:nullable(integer(1,25)),abilities:list(ability,0,3,true),
        freeChoices:integer(0,2),ready:flag}),0,6)}),
    rng:rngSchema
  });

  function addError(errors,path,reason){errors.push({path,reason});}

  // Fremde Laufzeiten dürfen einfache Objekte übergeben. Klassen, Getter und
  // Nicht-JSON-Werte werden abgewiesen, ohne benutzerdefinierte Getter auszuführen.
  function jsonErrors(value,path,errors,ancestors,depth){
    if(value===null || typeof value==='string' || typeof value==='boolean') return;
    if(typeof value==='number'){
      if(!Number.isFinite(value)) addError(errors,path,'Endliche Zahl erwartet');
      return;
    }
    if(typeof value!=='object'){
      addError(errors,path,'Nur JSON-Werte sind erlaubt');
      return;
    }
    if(depth>64){addError(errors,path,'Zu tief verschachtelt');return;}
    if(ancestors.has(value)){addError(errors,path,'Zyklischer Zustand ist nicht serialisierbar');return;}
    const array=Array.isArray(value), prototype=Object.getPrototypeOf(value);
    if(!array && prototype!==null && (Object.getPrototypeOf(prototype)!==null ||
      Object.getOwnPropertyDescriptor(prototype,'constructor')?.value?.name!=='Object')){
      addError(errors,path,'Einfaches Objekt erwartet');return;
    }
    if(Object.getOwnPropertySymbols(value).length) addError(errors,path,'Symbolschlüssel sind nicht erlaubt');
    const descriptors=Object.getOwnPropertyDescriptors(value);
    if(array){
      for(let i=0;i<value.length;i++) if(!own(descriptors,String(i))) addError(errors,path+'['+i+']','Array-Lücke ist nicht erlaubt');
    }
    ancestors.add(value);
    for(const key of Object.keys(descriptors)){
      if(array && key==='length') continue;
      const childPath=array?path+'['+key+']':path+'.'+key;
      const descriptor=descriptors[key];
      if(!own(descriptor,'value') || !descriptor.enumerable){
        addError(errors,childPath,'Nur aufzählbare Datenfelder sind erlaubt');continue;
      }
      if(array && (!/^(0|[1-9][0-9]*)$/.test(key) || Number(key)>=value.length)){
        addError(errors,childPath,'Zusätzliche Array-Felder sind nicht erlaubt');continue;
      }
      jsonErrors(descriptor.value,childPath,errors,ancestors,depth+1);
    }
    ancestors.delete(value);
  }

  function schemaErrors(value,schema,path,errors){
    if(schema.kind==='nullable'){
      if(value!==null) schemaErrors(value,schema.schema,path,errors);
      return;
    }
    if(schema.kind==='integer'){
      if(!Number.isSafeInteger(value) || value<schema.min || value>schema.max)
        addError(errors,path,'Ganze Zahl zwischen '+schema.min+' und '+schema.max+' erwartet');
      return;
    }
    if(schema.kind==='choice'){
      if(!schema.values.includes(value)) addError(errors,path,'Unzulässiger Wert');
      return;
    }
    if(schema.kind==='list'){
      if(!Array.isArray(value)){addError(errors,path,'Array erwartet');return;}
      if(value.length<schema.min || value.length>schema.max) addError(errors,path,'Unzulässige Array-Länge');
      if(schema.unique && new Set(value).size!==value.length) addError(errors,path,'Doppelte Werte sind nicht erlaubt');
      value.forEach((entry,i)=>schemaErrors(entry,schema.schema,path+'['+i+']',errors));
      return;
    }
    if(value===null || typeof value!=='object' || Array.isArray(value)){
      addError(errors,path,'Objekt erwartet');return;
    }
    for(const key of Object.keys(value)) if(!own(schema.fields,key)) addError(errors,path+'.'+key,'Unbekanntes Feld');
    for(const key of Object.keys(schema.fields)){
      if(!own(value,key)){
        if(!schema.optional.includes(key)) addError(errors,path+'.'+key,'Pflichtfeld fehlt');
      }else schemaErrors(value[key],schema.fields[key],path+'.'+key,errors);
    }
  }

  function checkShape(value,schema,path){
    const errors=[];
    try{
      jsonErrors(value,path,errors,new Set(),0);
      if(!errors.length) schemaErrors(value,schema,path,errors);
    }catch(_error){addError(errors,path,'Objekt kann nicht als JSON-Daten gelesen werden');}
    return errors;
  }

  function checkRng(rng,path,errors){
    if(rng.algorithm==='external' && (rng.seed!==null || rng.state!==null))
      addError(errors,path,'Externer Zufall hat keinen serialisierten Seed oder Generatorzustand');
    if(rng.algorithm==='mulberry32' && (rng.seed===null || rng.state===null))
      addError(errors,path,'Mulberry32 benötigt Seed und Generatorzustand');
  }

  function checkSeats(players,path,errors){
    const seats=players.map(player=>player.seat);
    if(new Set(seats).size!==seats.length) addError(errors,path,'Sitze müssen eindeutig sein');
    return seats;
  }

  function freshDice(){
    return Array.from({length:definitions.DICE_COUNT},()=>({value:null,locked:false,selected:false}));
  }

  function createState(setup){
    const errors=checkShape(setup,setupSchema,'setup');
    if(!errors.length){
      const rules=definitions.LOCAL_MODES[setup.modeId];
      const seats=checkSeats(setup.players,'setup.players',errors);
      setup.players.forEach((player,i)=>{
        if(player.abilities.length!==rules.startAbilityCount)
          addError(errors,'setup.players['+i+'].abilities','Startfähigkeiten müssen zum Modus passen');
      });
      if(own(setup,'startingSeat') && !seats.includes(setup.startingSeat))
        addError(errors,'setup.startingSeat','Startspieler muss teilnehmen');
      if(own(setup,'rng')) checkRng(setup.rng,'setup.rng',errors);
    }
    if(errors.length) throw new TypeError(errors.map(error=>error.path+': '+error.reason).join('; '));
    const rules=definitions.LOCAL_MODES[setup.modeId];
    const currentSeat=own(setup,'startingSeat')?setup.startingSeat:setup.players[0].seat;
    const state={
      ruleVersion:definitions.RULE_VERSION,stateVersion:definitions.STATE_VERSION,modeId:setup.modeId,
      masteryLevel:rules.allMasteryLevel||0,sequence:{action:0,event:0},
      players:setup.players.map(player=>({seat:player.seat,hp:rules.startHp,maxHp:rules.startHp,
        abilities:player.abilities.slice(),bonusAbilityUnlocked:rules.bonusSlot!==null && rules.startAbilityCount>=rules.bonusSlot,
        roundsWon:0,effects:{momentumStreak:0,lastStandUsed:false,lastStandCooldown:0,
          damageSinceLastOwnTurn:false,bloodRushPrimed:false,voluntaryHpPaidThisTurn:false,
          selfDamageSinceLastOwnTurn:false,underdogTurnActive:false,poisonTurns:0,poisonSourceSeat:null,healEffectCount:0,snakeEyesUsesThisTurn:0}})),
      turn:{number:1,currentSeat,phase:'idle',decision:{kind:'roll_base',seat:currentSeat}},dice:freshDice(),
      base:{rerollUsed:false,luckRerollIndex:null,luckRerollSecondUsed:false,luckRerollUses:0,
        loadedDiceUsed:false,loadedDiceUses:0,lastRollIndices:[]},
      attack:{face:null,targetSeat:null,hits:0,damage:0,firstRoll:true,currentRollNewHits:0,rollCount:0,masteryRollCount:0,
        normalHits:0,exactFaceHits:0,wildcardHits:0,lastRollIndices:[],powerUsed:false,powerUses:0,precisionUses:0,
        momentumBonus:0,bloodPriceNeighbors:[],bloodPricePaidThisRoll:0,bloodPriceWasPreActivatedThisRoll:false,
        bloodRushActive:false,doubleTapApplied:false,wildcardFace:null,wildcardSecondRollArmed:false,
        wildcardTriggered:false,masteryL2BonusesApplied:false,source:'normal',baseTotal:null},
      counter:{context:null,pending:null,dice:freshDice(),hits:0,firstRoll:true},
      draft:{active:null,queue:[],continuation:null},
      special:{gambling:{baseTotal:null,retryUsed:false,retryPending:false},perfect25:{baseTotal:null,pendingTotal:null},
        highStakes:{decisionMade:false,rawDamage:null},insurance:null},
      round:{number:own(setup,'roundNumber')?setup.roundNumber:1,eliminationOrder:[],lastPlaceSeat:null,
        winnerSeat:null,result:null,preparation:[]},
      rng:own(setup,'rng')?{algorithm:setup.rng.algorithm,seed:setup.rng.seed,state:setup.rng.state,drawIndex:setup.rng.drawIndex}:
        {algorithm:'external',seed:null,state:null,drawIndex:0}
    };
    // Der erste Zug beginnt bereits in idle. Underdog L1 hält bei gleichen
    // Start-HP die Bedingung für diesen ganzen Zug fest, wie prepareBloodRushForTurn.
    if(state.masteryLevel>0){
      const starter=state.players.find(player=>player.seat===currentSeat);
      starter.effects.underdogTurnActive=starter.abilities.includes(25);
    }
    return state;
  }

  function validateState(state){
    const errors=checkShape(state,stateSchema,'state');
    if(errors.length) return {valid:false,errors};
    const rules=definitions.LOCAL_MODES[state.modeId];
    const seats=checkSeats(state.players,'state.players',errors);
    const checkSeat=(value,path)=>{
      if(value!==null && !seats.includes(value)) addError(errors,path,'Sitz nimmt nicht teil');
    };
    if(state.masteryLevel!==(rules.allMasteryLevel||0)) addError(errors,'state.masteryLevel','Nur das vom Modus erzwungene Level ist erlaubt');
    state.players.forEach((player,i)=>{
      const path='state.players['+i+']';
      if(player.maxHp!==rules.startHp || player.hp>player.maxHp) addError(errors,path+'.hp','HP müssen innerhalb der Modusgrenzen liegen');
      const maximum=rules.bonusSlot||rules.startAbilityCount;
      if(player.abilities.length<rules.startAbilityCount || player.abilities.length>maximum)
        addError(errors,path+'.abilities','Fähigkeitszahl passt nicht zum Modus');
      if(player.abilities.length>rules.startAbilityCount && !player.bonusAbilityUnlocked)
        addError(errors,path+'.bonusAbilityUnlocked','Zusätzliche Fähigkeit benötigt Freischaltung');
      checkSeat(player.effects.poisonSourceSeat,path+'.effects.poisonSourceSeat');
      if(player.effects.poisonTurns>0 && player.effects.poisonSourceSeat===null)
        addError(errors,path+'.effects.poisonSourceSeat','Aktives Gift benötigt eine Quelle');
      if(player.effects.poisonSourceSeat===player.seat)
        addError(errors,path+'.effects.poisonSourceSeat','Giftquelle muss ein anderer Teilnehmer sein');
      if(state.masteryLevel===0 && (player.effects.lastStandCooldown!==0 || player.effects.poisonTurns!==0 ||
        player.effects.poisonSourceSeat!==null || player.effects.healEffectCount!==0 || player.effects.underdogTurnActive))
        addError(errors,path+'.effects','Mastery-Effekte sind nur im erzwungenen Modus erlaubt');
    });
    checkSeat(state.turn.currentSeat,'state.turn.currentSeat');
    if(state.turn.decision) checkSeat(state.turn.decision.seat,'state.turn.decision.seat');
    if(state.turn.phase!=='resolving' && state.turn.phase!=='finished' && state.turn.decision===null)
      addError(errors,'state.turn.decision','Spielerentscheidung benötigt einen Inhaber');
    if((state.turn.phase==='resolving' || state.turn.phase==='finished') && state.turn.decision!==null)
      addError(errors,'state.turn.decision','Automatischer oder fertiger Zustand hat keine Spielerentscheidung');
    const phaseDecisions={idle:'roll_base',base_select:'select_base',base_ready:'roll_base',
      gamble_attack:'gambling',gamble_retry_offer:'gambling_retry_offer',gamble_retry:'gambling_retry',
      perfect25:'perfect25',perfect25_d4:'perfect25_d4',insurance:'insurance',attack_ready:'roll_attack',
      attack_target:'choose_attack_target',attack_after_roll:'resolve_attack',attack_continue:'roll_attack',
      high_stakes:'high_stakes',counterattack:'counterattack',draft_pending:'choose_ability',turn_done:'end_turn'};
    if(state.turn.decision){
      let expectedKind=phaseDecisions[state.turn.phase],expectedSeat=state.turn.currentSeat;
      if(state.draft.active){expectedKind='choose_ability';expectedSeat=state.draft.active.seat;}
      else if(state.turn.phase==='draft_pending' && state.draft.queue.length){
        expectedKind='choose_ability';expectedSeat=state.draft.queue[0].seat;
      }
      else if(state.turn.phase==='counterattack') expectedSeat=state.counter.context?.defenderSeat;
      if(state.turn.phase==='round_preparation'){
        if(!['prepare_round','choose_start_abilities','start_round'].includes(state.turn.decision.kind))
          addError(errors,'state.turn.decision.kind','Unzulässige Entscheidung für Rundenvorbereitung');
      }else if(state.turn.decision.kind!==expectedKind || state.turn.decision.seat!==expectedSeat)
        addError(errors,'state.turn.decision','Entscheidung und Inhaber müssen zur Phase passen');
      if(!['turn_done','round_preparation'].includes(state.turn.phase) &&
        state.players.find(player=>player.seat===state.turn.decision.seat)?.hp===0)
        addError(errors,'state.turn.decision.seat','Ausgeschiedener Spieler darf keine Kampfentscheidung treffen');
    }
    if(state.turn.phase==='counterattack' && state.counter.context===null)
      addError(errors,'state.counter.context','Konterphase benötigt einen Konterkontext');
    if(state.counter.context!==null && state.turn.phase!=='counterattack')
      addError(errors,'state.counter.context','Aktiver Konter benötigt die Konterphase');
    if(['attack_ready','attack_after_roll','attack_continue','high_stakes'].includes(state.turn.phase) &&
      (state.attack.face===null || state.attack.targetSeat===null || state.attack.baseTotal===null))
      addError(errors,'state.attack','Angriffsphase benötigt Zielzahl, Ziel und Basissumme');
    if(state.turn.phase==='attack_target' &&
      (state.attack.face===null || state.attack.targetSeat!==null || state.attack.baseTotal===null))
      addError(errors,'state.attack','Zielwahl benötigt Zielzahl und Basissumme, aber noch kein Ziel');
    if(['gamble_attack','gamble_retry_offer','gamble_retry'].includes(state.turn.phase) && state.special.gambling.baseTotal===null)
      addError(errors,'state.special.gambling.baseTotal','Gambling-Entscheidung benötigt eine Basissumme');
    if(['perfect25','perfect25_d4'].includes(state.turn.phase) && state.special.perfect25.baseTotal===null)
      addError(errors,'state.special.perfect25.baseTotal','Perfect-25-Entscheidung benötigt eine Basissumme');
    if(state.turn.phase==='insurance' && state.special.insurance===null)
      addError(errors,'state.special.insurance','Insurance-Entscheidung benötigt einen Schadenskontext');
    if(state.turn.phase==='high_stakes' && state.special.highStakes.rawDamage===null)
      addError(errors,'state.special.highStakes.rawDamage','High-Stakes-Entscheidung benötigt den Ausgangsschaden');
    checkSeat(state.attack.targetSeat,'state.attack.targetSeat');
    if(state.attack.targetSeat===state.turn.currentSeat) addError(errors,'state.attack.targetSeat','Angreifer darf nicht sein eigenes Ziel sein');
    const checkDice=(dice,path)=>dice.forEach((die,i)=>{
      if(die.value===null && (die.locked || die.selected)) addError(errors,path+'['+i+']','Ungewürfelter Würfel darf nicht markiert sein');
      if(die.locked && die.selected) addError(errors,path+'['+i+']','Gesperrter Würfel darf nicht ausgewählt sein');
    });
    checkDice(state.dice,'state.dice');
    checkDice(state.counter.dice,'state.counter.dice');
    for(const key of ['context','pending']){
      const context=state.counter[key];
      if(!context) continue;
      checkSeat(context.defenderSeat,'state.counter.'+key+'.defenderSeat');
      checkSeat(context.attackerSeat,'state.counter.'+key+'.attackerSeat');
      if(context.defenderSeat===context.attackerSeat) addError(errors,'state.counter.'+key,'Konter benötigt zwei verschiedene Teilnehmer');
    }
    const drafts=[...(state.draft.active?[state.draft.active]:[]),...state.draft.queue];
    const draftSeats=new Set();
    drafts.forEach((draft,i)=>{
      const path=i===0 && state.draft.active?'state.draft.active':'state.draft.queue['+(i-(state.draft.active?1:0))+']';
      checkSeat(draft.seat,path+'.seat');
      if(draftSeats.has(draft.seat)) addError(errors,path+'.seat','Teilnehmer hat bereits einen offenen Draft');
      draftSeats.add(draft.seat);
      const player=state.players.find(entry=>entry.seat===draft.seat);
      if(draft.slot!==rules.bonusSlot || draft.trigger==='kill' && !rules.bonusOnKill) addError(errors,path,'Draft passt nicht zum Modus');
      if(player && (player.hp===0 || !player.bonusAbilityUnlocked || player.abilities.length!==draft.slot-1))
        addError(errors,path,'Draft benötigt einen lebenden Teilnehmer mit reserviertem, ungefülltem Bonusplatz');
      if(own(draft,'choices') && draft.choices.some(id=>!definitions.CHOOSABLE_ABILITY_IDS.includes(id) || player?.abilities.includes(id)))
        addError(errors,path+'.choices','Draft darf nur wählbare, noch nicht vorhandene Fähigkeiten anbieten');
    });
    if(state.turn.phase==='draft_pending' && state.draft.active===null && !state.draft.queue.length)
      addError(errors,'state.draft','Blockierter Draft benötigt eine aktive oder wartende Auswahl');
    if(state.turn.phase!=='draft_pending' && state.draft.active===null && state.draft.continuation!==null)
      addError(errors,'state.draft.continuation','Fortsetzung ohne blockierten Draft ist nicht erlaubt');
    state.round.eliminationOrder.forEach((value,i)=>{
      checkSeat(value,'state.round.eliminationOrder['+i+']');
      if(state.players.find(player=>player.seat===value)?.hp>0) addError(errors,'state.round.eliminationOrder['+i+']','Lebender Spieler darf nicht ausgeschieden sein');
    });
    checkSeat(state.round.lastPlaceSeat,'state.round.lastPlaceSeat');
    if(state.round.lastPlaceSeat!==null && !state.round.eliminationOrder.includes(state.round.lastPlaceSeat))
      addError(errors,'state.round.lastPlaceSeat','Letzter Platz muss ausgeschieden sein');
    checkSeat(state.round.winnerSeat,'state.round.winnerSeat');
    if(state.round.result){
      checkSeat(state.round.result.winnerSeat,'state.round.result.winnerSeat');
      if(state.round.result.winnerSeat!==state.round.winnerSeat) addError(errors,'state.round.result.winnerSeat','Rundenergebnis und Sieger müssen übereinstimmen');
      if(state.round.result.reason==='draw' && state.round.winnerSeat!==null ||
        state.round.result.reason==='last_alive' && state.round.winnerSeat===null)
        addError(errors,'state.round.result','Ergebnisgrund passt nicht zum Sieger');
      const survivors=state.players.filter(player=>player.hp>0);
      if(state.round.result.reason==='last_alive' && (survivors.length!==1 || survivors[0].seat!==state.round.winnerSeat) ||
        state.round.result.reason==='draw' && survivors.length!==0)
        addError(errors,'state.round.result','Rundenergebnis passt nicht zu den verbleibenden Spielern');
    }
    if(state.turn.phase==='finished' && state.round.result===null) addError(errors,'state.round.result','Beendete Runde benötigt ein Ergebnis');
    if(state.turn.phase==='round_preparation' && state.round.result===null) addError(errors,'state.round.result','Neue Runde benötigt das vorherige Ergebnis');
    const preparedSeats=new Set();
    state.round.preparation.forEach((entry,i)=>{
      checkSeat(entry.seat,'state.round.preparation['+i+'].seat');
      if(preparedSeats.has(entry.seat)) addError(errors,'state.round.preparation['+i+'].seat','Doppelte Rundenvorbereitung');
      preparedSeats.add(entry.seat);
      if(entry.abilities.length>rules.startAbilityCount || entry.ready && entry.abilities.length!==rules.startAbilityCount)
        addError(errors,'state.round.preparation['+i+'].abilities','Startfähigkeiten müssen zum Modus passen');
    });
    checkRng(state.rng,'state.rng',errors);
    return {valid:errors.length===0,errors};
  }

  engine.createState=createState;
  engine.validateState=validateState;
})(globalThis);
