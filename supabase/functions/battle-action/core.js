// Serverautoritativer Kampfschritt: Kontext laden, mit der gemeinsamen Engine
// reduzieren, Ergebnis atomar verbuchen. Reines JavaScript ohne Deno- oder
// Supabase-Abhaengigkeit, damit Node denselben Ablauf ohne Server pruefen kann
// (scripts/qa/edge-battle-action.mjs). Engine und Datenbankzugriff kommen
// als Abhaengigkeiten herein.
//
// Der Seed und der Generatorzustand liegen nur in der privaten Tabelle
// dd_battle_private.match_rng. Im oeffentlichen State steht die Engine mit
// algorithm 'external' und ohne Seed: wer den Generatorzustand kennt, kennt
// jeden kommenden Wurf.

export const ENVELOPE_SCHEMA='server-1';
export const INIT_ACTION='init_match';
export const ONLINE_MODES=Object.freeze(['classic','endurance50','overload75']);

// Online ist ein Match gleich eine Runde; Revanche laeuft ueber die Lobby.
const BLOCKED_ACTIONS=new Set(['prepare_round','choose_start_abilities','start_round']);

export class ActionError extends Error{
  constructor(status,code,detail=''){
    super(code);
    this.status=status;this.code=code;this.detail=String(detail||'');
  }
}

export function mulberry32(state){
  let current=state>>>0,draws=0;
  return {
    next(){
      current=(current+0x6D2B79F5)>>>0;draws++;
      let mixed=current;
      mixed=Math.imul(mixed^(mixed>>>15),mixed|1);
      mixed^=mixed+Math.imul(mixed^(mixed>>>7),mixed|61);
      return ((mixed^(mixed>>>14))>>>0)/4294967296;
    },
    state:()=>current,
    draws:()=>draws
  };
}

// Wie randomOnlineAbility im Browser: W25, die 6 ist eine freie Wahl aus dem
// Pool. Auf dem Server gibt es keine Wahl, also zieht der Server sie.
function rollStartAbilities(definitions,count,random){
  const pool=definitions.CHOOSABLE_ABILITY_IDS;
  const roll=()=>{
    const rolled=Math.floor(random()*25)+1;
    return rolled===6?{rolled,ability:pool[Math.floor(random()*pool.length)]}:{rolled,ability:rolled};
  };
  const picked=[];
  for(let slot=0;slot<count;slot++){
    let next=roll(),guard=0;
    while(picked.some(entry=>entry.ability===next.ability)){
      if(++guard>200) throw new ActionError(500,'ABILITY_ROLL_EXHAUSTED');
      next=roll();
    }
    picked.push(next);
  }
  return picked;
}

function shuffled(list,random){
  const result=list.slice();
  for(let i=result.length-1;i>0;i--){
    const j=Math.floor(random()*(i+1));
    [result[i],result[j]]=[result[j],result[i]];
  }
  return result;
}

export function publicEngineState(state){
  return {...state,rng:{algorithm:'external',seed:null,state:null,drawIndex:state.rng.drawIndex}};
}

export function buildEnvelope({engineState,seats,matchId}){
  const uidForSeat=seat=>seats.find(entry=>entry.seat===seat)?.uid||'';
  const decisionSeat=engineState.turn.decision?.seat??engineState.turn.currentSeat;
  const finished=!!engineState.round.result;
  const winnerSeat=engineState.round.result?.winnerSeat??null;
  return {
    schema:ENVELOPE_SCHEMA,
    ruleVersion:engineState.ruleVersion,
    matchId,
    modeId:engineState.modeId,
    seats:seats.map(entry=>({...entry})),
    engine:publicEngineState(engineState),
    currentPlayerUid:uidForSeat(engineState.turn.currentSeat),
    // Nach Matchende entscheidet niemand mehr im Kampf.
    interactionOwnerUid:finished?'':uidForSeat(decisionSeat),
    finished,
    winnerUid:winnerSeat===null?'':uidForSeat(winnerSeat)
  };
}

export function createBattleActionHandler({engine,store}){
  if(!engine?.reduce||!engine?.createState) throw new TypeError('engine');
  for(const name of ['loadAction','commitAction','loadRoom'])
    if(typeof store?.[name]!=='function') throw new TypeError('store.'+name);

  async function initialize(ctx,request){
    if(ctx.state?.engine) throw new ActionError(409,'MATCH_ALREADY_INITIALIZED');
    const room=await store.loadRoom(request.roomId);
    const modeId=String(room?.modeId||'');
    if(!ONLINE_MODES.includes(modeId)) throw new ActionError(422,'MODE_NOT_ONLINE',modeId);
    const members=(room.members||[]).slice().sort((a,b)=>a.seat-b.seat);
    if(members.length<2||members.length>4) throw new ActionError(422,'PLAYER_COUNT',members.length);
    if(!members.some(member=>member.userId===request.userId)) throw new ActionError(403,'NOT_ROOM_MEMBER');

    const generator=mulberry32(ctx.rng.state);
    const random=()=>generator.next();
    const order=shuffled(members,random);
    const count=engine.definitions.LOCAL_MODES[modeId].startAbilityCount;
    const rolls=order.map(()=>rollStartAbilities(engine.definitions,count,random));
    const seats=order.map((member,seat)=>({seat,uid:member.userId,rolledAbilities:rolls[seat].map(entry=>entry.rolled)}));
    const engineState=engine.createState({
      modeId,startingSeat:0,roundNumber:1,
      players:order.map((_member,seat)=>({seat,abilities:rolls[seat].map(entry=>entry.ability)})),
      rng:{algorithm:'mulberry32',seed:ctx.rng.seed,state:generator.state(),drawIndex:ctx.rng.drawIndex+generator.draws()}
    });
    return {engineState,seats,events:[{id:'event-init',type:'MatchInitialized',seats:seats.map(entry=>({...entry}))}]};
  }

  function advance(ctx,request){
    const stored=ctx.state?.engine;
    if(!stored) throw new ActionError(409,'MATCH_NOT_INITIALIZED');
    if(BLOCKED_ACTIONS.has(request.type)) throw new ActionError(422,'ACTION_NOT_ONLINE',request.type);
    if(stored.rng?.drawIndex!==ctx.rng.drawIndex) throw new ActionError(500,'RNG_OUT_OF_SYNC');
    const state={...stored,rng:{algorithm:'mulberry32',seed:ctx.rng.seed,state:ctx.rng.state,drawIndex:ctx.rng.drawIndex}};
    // Den Sitz bestimmt der Server aus der Mitgliedschaft, nie die Nutzlast.
    const {seat:_ignoredSeat,type:_ignoredType,...fields}=request.payload;
    const result=engine.reduce(state,{...fields,type:request.type,seat:ctx.seat});
    if(result.rejected) throw new ActionError(422,'ACTION_REJECTED',result.reason);
    return {engineState:result.state,seats:ctx.state.seats,events:result.events};
  }

  return async function handle(request){
    const ctx=await store.loadAction(request);
    if(ctx?.replay) return {status:200,body:{ok:true,replay:true,...(ctx.result||{})}};
    if(!ctx?.rng||!Number.isInteger(ctx.seat)) throw new ActionError(500,'CONTEXT_INCOMPLETE');

    const next=request.type===INIT_ACTION?await initialize(ctx,request):advance(ctx,request);
    const envelope=buildEnvelope({engineState:next.engineState,seats:next.seats,matchId:ctx.matchId});
    const committed=await store.commitAction({
      ...request,
      nextState:envelope,
      rngState:next.engineState.rng.state,
      drawIndex:next.engineState.rng.drawIndex,
      events:next.events
    });
    return {status:200,body:{ok:true,seq:committed?.seq??ctx.seq+1,state:envelope,events:next.events}};
  };
}

export function parseRequest(body,userId){
  const roomId=String(body?.roomId||'');
  const actionId=String(body?.actionId||'');
  const type=String(body?.type||'');
  const baseSeq=Number(body?.baseSeq);
  const payload=(body?.payload&&typeof body.payload==='object'&&!Array.isArray(body.payload))?body.payload:{};
  if(!/^[0-9a-f-]{36}$/i.test(roomId)||!actionId||actionId.length>128||!/^[a-z0-9_]{1,64}$/.test(type)
    ||!Number.isSafeInteger(baseSeq)||baseSeq<0) throw new ActionError(400,'INVALID_ACTION');
  return {userId,roomId,actionId,type,baseSeq,payload};
}
