import { createClient } from "npm:@supabase/supabase-js@2.114.0";

const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Headers":"authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods":"POST, OPTIONS",
  "Content-Type":"application/json"
};

function response(status:number,body:Record<string,unknown>){
  return new Response(JSON.stringify(body),{status,headers:corsHeaders});
}

Deno.serve(async request=>{
  if(request.method==="OPTIONS") return new Response("ok",{headers:corsHeaders});
  if(request.method!=="POST") return response(405,{ok:false,error:"METHOD_NOT_ALLOWED"});

  const authorization=request.headers.get("Authorization")||"";
  if(!authorization.startsWith("Bearer ")) return response(401,{ok:false,error:"AUTH_REQUIRED"});

  const projectUrl=Deno.env.get("SUPABASE_URL")||"";
  const publicKey=Deno.env.get("SUPABASE_ANON_KEY")||Deno.env.get("SUPABASE_PUBLISHABLE_KEY")||"";
  if(!projectUrl||!publicKey) return response(500,{ok:false,error:"FUNCTION_NOT_CONFIGURED"});

  const supabase=createClient(projectUrl,publicKey,{
    global:{headers:{Authorization:authorization}},
    auth:{persistSession:false,autoRefreshToken:false,detectSessionInUrl:false}
  });

  const token=authorization.slice(7);
  const {data:userData,error:userError}=await supabase.auth.getUser(token);
  if(userError||!userData?.user) return response(401,{ok:false,error:"INVALID_SESSION"});

  let body:Record<string,unknown>;
  try{body=await request.json();}
  catch(_error){return response(400,{ok:false,error:"INVALID_JSON"});}

  const roomId=String(body.roomId||"");
  const actionId=String(body.actionId||"");
  const type=String(body.type||"");
  const baseSeq=Number(body.baseSeq);
  const payload=(body.payload&&typeof body.payload==="object"&&!Array.isArray(body.payload))?body.payload:{};
  if(!roomId||!actionId||!type||!Number.isSafeInteger(baseSeq)||baseSeq<0){
    return response(400,{ok:false,error:"INVALID_ACTION"});
  }

  const {data,error}=await supabase.rpc("dd_submit_battle_action",{
    p_room_id:roomId,
    p_client_action_id:actionId,
    p_base_seq:baseSeq,
    p_action_type:type,
    p_payload:payload
  });
  if(error){
    const stale=error.code==="40001"||/DD_STALE_STATE/i.test(error.message||"");
    return response(stale?409:403,{ok:false,error:error.message||"ACTION_REJECTED",code:error.code||null});
  }

  return response(202,{ok:true,action:Array.isArray(data)?data[0]:data,userId:userData.user.id});
});
