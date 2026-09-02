(() => {
  "use strict";

  const root=window.WDSupabase;
  if(!root?.configured) return;

  const first=value=>Array.isArray(value)?(value[0]||null):(value||null);
  const requireValue=(value,code)=>{if(!value)throw new Error(code);return value;};

  async function rpc(name,args={}){
    const client=await root.getClient();
    const {data,error}=await client.rpc(name,args);
    if(error) throw error;
    return data;
  }

  async function identity(){
    const user=await root.ensureOnlineIdentity();
    return {uid:user.id,email:String(user.email||""),anonymous:!!user.is_anonymous};
  }

  function mapAction(row){
    return {
      id:String(row?.client_action_id||""),
      rowId:String(row?.id||""),
      type:String(row?.action_type||""),
      payload:row?.payload&&typeof row.payload==="object"?row.payload:{},
      actorUid:String(row?.actor_user_id||""),
      baseSeq:Number(row?.base_seq)||0,
      status:String(row?.status||""),
      reason:String(row?.error_message||""),
      requestedAt:Date.parse(row?.created_at||"")||0,
      resolvedAt:Date.parse(row?.resolved_at||"")||0
    };
  }

  function mapEvent(row){
    const event=row?.event&&typeof row.event==="object"?row.event:{};
    return {
      ...event,
      rowId:String(row?.id||""),
      actorUid:String(event.actorUid||row?.actor_user_id||""),
      createdAt:Date.parse(row?.created_at||"")||Number(event.startedAt)||0
    };
  }

  async function getSnapshot(roomId){
    const id=String(roomId||"");
    const client=await root.getClient();
    const [snapshotResult,actionsResult,eventsResult]=await Promise.all([
      client.rpc("dd_get_battle_snapshot",{p_room_id:id}),
      client.from("dd_battle_actions")
        .select("id,client_action_id,actor_user_id,base_seq,action_type,payload,status,error_message,created_at,resolved_at")
        .eq("room_id",id).order("created_at",{ascending:false}).limit(96),
      client.from("dd_battle_events")
        .select("id,actor_user_id,event,created_at")
        .eq("room_id",id).order("created_at",{ascending:false}).limit(48)
    ]);
    if(snapshotResult.error) throw snapshotResult.error;
    if(actionsResult.error) throw actionsResult.error;
    if(eventsResult.error) throw eventsResult.error;
    const snapshot=first(snapshotResult.data);
    if(!snapshot) return null;
    return {
      ...snapshot,
      actions:(actionsResult.data||[]).slice().reverse().map(mapAction),
      events:(eventsResult.data||[]).slice().reverse().map(mapEvent)
    };
  }

  async function createRoom({maxPlayers=2,modeId="classic",gameVersion="unknown",profile={}}={}){
    const user=await identity();
    const room=first(await rpc("dd_create_battle_room",{
      p_max_players:Number(maxPlayers)||2,
      p_mode_id:String(modeId||"classic"),
      p_game_version:String(gameVersion||"unknown"),
      p_profile:profile&&typeof profile==="object"?profile:{}
    }));
    requireValue(room,"SUPABASE_ROOM_CREATE_FAILED");
    return {...room,uid:user.uid,snapshot:await getSnapshot(room.id)};
  }

  async function joinRoom(code,profile={}){
    const user=await identity();
    const room=first(await rpc("dd_join_battle_room",{
      p_code:String(code||"").trim().toUpperCase(),
      p_profile:profile&&typeof profile==="object"?profile:{}
    }));
    requireValue(room,"SUPABASE_ROOM_JOIN_FAILED");
    return {...room,uid:user.uid,snapshot:await getSnapshot(room.id)};
  }

  async function reconnectRoom(code=""){
    const user=await identity();
    const client=await root.getClient();
    let query=client.from("dd_battle_members")
      .select("room_id,joined_at")
      .eq("user_id",user.uid)
      .order("joined_at",{ascending:false})
      .limit(8);
    const {data,error}=await query;
    if(error) throw error;
    const wanted=String(code||"").trim().toUpperCase();
    for(const row of data||[]){
      try{
        const snapshot=await getSnapshot(row.room_id);
        if(!snapshot) continue;
        if(wanted&&String(snapshot.code||"")!==wanted) continue;
        if(!["lobby","playing"].includes(String(snapshot.meta?.status||""))) continue;
        return {id:snapshot.id,code:snapshot.code,uid:user.uid,snapshot};
      }catch(_error){}
    }
    return null;
  }

  async function setReady(roomId,ready){
    return first(await rpc("dd_set_battle_ready",{p_room_id:String(roomId||""),p_ready:!!ready}));
  }

  async function startMatch(roomId,match){
    return first(await rpc("dd_start_battle",{
      p_room_id:String(roomId||""),
      p_match:match&&typeof match==="object"?match:{}
    }));
  }

  async function submitAction(roomId,{id,type,payload={},baseSeq=0}={}){
    return first(await rpc("dd_submit_battle_action",{
      p_room_id:String(roomId||""),
      p_client_action_id:String(id||globalThis.crypto?.randomUUID?.()||Date.now()),
      p_base_seq:Number(baseSeq)||0,
      p_action_type:String(type||""),
      p_payload:payload&&typeof payload==="object"?payload:{}
    }));
  }

  async function publishState(roomId,{seq,state,actionId="",actionType=""}={}){
    return first(await rpc("dd_publish_battle_state",{
      p_room_id:String(roomId||""),
      p_seq:Number(seq)||0,
      p_state:state&&typeof state==="object"?state:{},
      p_action_id:String(actionId||""),
      p_action_type:String(actionType||"")
    }));
  }

  async function resolveAction(roomId,actionId,status,errorMessage=""){
    return first(await rpc("dd_resolve_battle_action",{
      p_room_id:String(roomId||""),
      p_action_id:String(actionId||""),
      p_status:String(status||"rejected"),
      p_error:String(errorMessage||"")
    }));
  }

  async function emitEvent(roomId,event){
    return first(await rpc("dd_emit_battle_event",{
      p_room_id:String(roomId||""),
      p_event:event&&typeof event==="object"?event:{}
    }));
  }

  async function setPostMatchChoice(roomId,choice){
    return first(await rpc("dd_set_post_match_choice",{
      p_room_id:String(roomId||""),
      p_choice:String(choice||"")
    }));
  }

  async function resetLobby(roomId,{matchId="",rematch=false,force=false}={}){
    return first(await rpc("dd_reset_battle_lobby",{
      p_room_id:String(roomId||""),
      p_match_id:String(matchId||""),
      p_rematch:!!rematch,
      p_force:!!force
    }));
  }

  async function leaveRoom(roomId){
    await rpc("dd_leave_battle_room",{p_room_id:String(roomId||"")});
    return true;
  }

  async function subscribeRoom(roomId,onSnapshot,onStatus){
    const client=await root.getClient();
    const id=String(roomId||"");
    let closed=false,timer=0,inFlight=false,refreshAgain=false;

    const refresh=async()=>{
      if(closed) return;
      if(inFlight){refreshAgain=true;return;}
      inFlight=true;
      try{onSnapshot?.(await getSnapshot(id));}
      catch(error){onStatus?.("ERROR",error);}
      finally{
        inFlight=false;
        if(refreshAgain){refreshAgain=false;queue();}
      }
    };
    const queue=()=>{
      if(closed||timer) return;
      timer=setTimeout(()=>{timer=0;refresh();},45);
    };

    const channel=client.channel(`dd-room:${id}`);
    ["dd_battle_members","dd_battle_states","dd_battle_actions","dd_battle_events","dd_battle_post_match"].forEach(table=>{
      channel.on("postgres_changes",{event:"*",schema:"public",table,filter:`room_id=eq.${id}`},queue);
    });
    // dd_battle_rooms uses its primary key as id rather than room_id.
    channel.on("postgres_changes",{event:"*",schema:"public",table:"dd_battle_rooms",filter:`id=eq.${id}`},queue);
    channel.subscribe(status=>{
      onStatus?.(status);
      if(status==="SUBSCRIBED") refresh();
    });

    return async()=>{
      closed=true;
      if(timer) clearTimeout(timer);
      await client.removeChannel(channel);
    };
  }

  const backend=Object.freeze({
    kind:"supabase",
    stage:"online-ready",
    identity,
    createRoom,
    joinRoom,
    reconnectRoom,
    getSnapshot,
    subscribeRoom,
    setReady,
    startMatch,
    submitAction,
    publishState,
    resolveAction,
    emitEvent,
    setPostMatchChoice,
    resetLobby,
    leaveRoom
  });

  window.WDSupabaseBattleBackend=backend;
  if(window.WDBackendConfig?.onlineProvider==="supabase"){
    window.WDOnlineBackend=backend;
  }
})();
