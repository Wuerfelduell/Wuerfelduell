(() => {
  "use strict";
  const api=window.WDOnlineStats=window.WDOnlineStats||{};
  const uuid=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  const fail=()=>{throw new Error("DD_STATS_INVALID_REPORT");};
  const integer=(value,min,max)=>Number.isInteger(value)&&value>=min&&value<=max;
  api.isAccountId=value=>typeof value==="string"&&uuid.test(value);

  // Whitelist statt ungeprüfter Save-Kopie: keine Namen, E-Mails oder
  // Profilbesitzstände im Transport. Herkunft/Version bleiben auswertbar.
  api.normalizeReport=function(input){
    if(!input||input.schema_version!==1||!uuid.test(input.event_id||"")) fail();
    if(!["local","online"].includes(input.source)) fail();
    if(typeof input.game_version!=="string"||!/^\d{1,4}\.\d{1,4}\.\d{1,4}$/.test(input.game_version)) fail();
    if(!["classic","endurance50","overload75","mayhem","campaign_solo","campaign_duo","campaign_trio","boss_rush_duo","boss_rush_trio"].includes(input.mode_id)) fail();
    if(!integer(input.round_number,1,1000000)) fail();
    if(!Array.isArray(input.players)||!integer(input.players.length,2,8)) fail();
    if(input.source==="online"&&(!uuid.test(input.room_id||"")||typeof input.match_id!=="string"||! /^[a-zA-Z0-9_-]{1,100}$/.test(input.match_id))) fail();
    if(input.source==="local"&&(input.room_id!=null||input.match_id!=null)) fail();
    const seats=new Set();
    const players=input.players.map(player=>{
      if(!player||!integer(player.seat,0,input.players.length-1)||seats.has(player.seat)) fail();
      seats.add(player.seat);
      if(typeof player.is_bot!=="boolean"||typeof player.won!=="boolean") fail();
      const minimum=input.source==="local"&&player.is_bot?0:1;
      if(!Array.isArray(player.abilities)||!integer(player.abilities.length,minimum,25)) fail();
      const ids=new Set();
      const abilities=player.abilities.map(ability=>{
        if(!ability||!integer(ability.id,1,25)||ids.has(ability.id)||!integer(ability.level,0,2)) fail();
        if(!["start","later","unknown"].includes(ability.acquired)) fail();
        ids.add(ability.id);
        return {id:ability.id,level:ability.level,acquired:ability.acquired};
      }).sort((a,b)=>a.id-b.id);
      return {seat:player.seat,is_bot:player.is_bot,won:player.won,abilities};
    }).sort((a,b)=>a.seat-b.seat);
    const winners=players.filter(p=>p.won).length;
    const team=input.source==="local"&&["campaign_solo","campaign_duo","campaign_trio","boss_rush_duo","boss_rush_trio"].includes(input.mode_id);
    if((team?(winners<1||winners>=players.length):winners!==1)||players.every(p=>p.is_bot)) fail();
    if(input.source==="online"&&players.some(p=>p.is_bot)) fail();
    return {
      schema_version:1,event_id:input.event_id.toLowerCase(),source:input.source,
      game_version:input.game_version,mode_id:input.mode_id,round_number:input.round_number,
      room_id:input.source==="online"?input.room_id.toLowerCase():null,
      match_id:input.source==="online"?input.match_id:null,players
    };
  };
})();
