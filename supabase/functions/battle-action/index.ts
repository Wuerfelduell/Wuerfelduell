import { createClient } from "npm:@supabase/supabase-js@2.114.0";
import * as engine from "../_shared/engine.ts";
import { ActionError, createBattleActionHandler, parseRequest } from "./core.js";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};

function response(status:number,body:Record<string,unknown>){
  return new Response(JSON.stringify(body),{status,headers:corsHeaders});
}

// Datenbankfehler aus den RPCs auf HTTP abbilden. DD_STALE_STATE (40001)
// heisst: Zustand neu lesen und erneut senden.
function rpcError(error:{code?:string,message?:string}){
  const message=String(error?.message||"");
  if(error?.code==="40001"||/DD_STALE_STATE/.test(message)) return new ActionError(409,"DD_STALE_STATE",message);
  const known=/DD_[A-Z_]+/.exec(message)?.[0];
  return new ActionError(known?403:500,known||"RPC_FAILED",message);
}

Deno.serve(async request=>{
  if(request.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST") return response(405,{ok:false,error:"METHOD_NOT_ALLOWED"});

  const authorization=request.headers.get("Authorization")||"";
  if(!authorization.startsWith("Bearer ")) return response(401,{ok:false,error:"AUTH_REQUIRED"});

  const projectUrl=Deno.env.get("SUPABASE_URL")||"";
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||"";
  const serviceKey=Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")||"";
  if(!projectUrl||!publicKey||!serviceKey) return response(500,{ok:false,error:"FUNCTION_NOT_CONFIGURED"});

  // Identitaet nur aus dem geprueften JWT, nie aus der Nutzlast.
  const caller=createClient(projectUrl,publicKey,{
    global:{headers:{Authorization:authorization}},
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const token=authorization.slice(7);
  const {data:userData,error:userError}=await caller.auth.getUser(token);
  if(userError||!userData?.user) return response(401,{ok:false,error:"INVALID_SESSION"});

  // Der Dienstschluessel bleibt in dieser Funktion; die beiden internen RPCs
  // sind nur fuer service_role ausfuehrbar.
  const server=createClient(projectUrl,serviceKey,{
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });
  const store={
    async loadAction(action:Record<string,unknown>){
      const {data,error}=await server.rpc("dd_server_load_action",{
        p_room_id:action.roomId,p_user_id:action.userId,p_client_action_id:action.actionId,
        p_base_seq:action.baseSeq,p_action_type:action.type,p_payload:action.payload
      });
      if(error) throw rpcError(error);
      return data;
    },
    async commitAction(action:Record<string,unknown>){
      const {data,error}=await server.rpc("dd_server_commit_action",{
        p_room_id:action.roomId,p_user_id:action.userId,p_client_action_id:action.actionId,
        p_base_seq:action.baseSeq,p_action_type:action.type,p_payload:action.payload,
        p_next_state:action.nextState,p_rng_state:action.rngState,p_draw_index:action.drawIndex,
        p_events:action.events
      });
      if(error) throw rpcError(error);
      return data;
    },
    async loadRoom(roomId:string){
      const [room,members]=await Promise.all([
        server.from("dd_battle_rooms").select("mode_id").eq("id",roomId).single(),
        server.from("dd_battle_members").select("user_id,seat").eq("room_id",roomId)
      ]);
      if(room.error) throw rpcError(room.error);
      if(members.error) throw rpcError(members.error);
      return {modeId:room.data.mode_id,members:(members.data||[]).map(row=>({userId:row.user_id,seat:row.seat}))};
    }
  };
  const handle=createBattleActionHandler({engine,store});

  try{
    let body:unknown;
    try{body=await request.json();}
    catch(_error){return response(400,{ok:false,error:"INVALID_JSON"});}
    const result=await handle(parseRequest(body,userData.user.id));
    return response(result.status,result.body);
  }catch(error){
    if(error instanceof ActionError) return response(error.status,{ok:false,error:error.code,detail:error.detail});
    console.error("battle-action",error);
    return response(500,{ok:false,error:"INTERNAL"});
  }
});
