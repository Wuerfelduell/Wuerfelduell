(function(){
  "use strict";
  const layer=document.getElementById("attackFxLayer");
  let lastPlayedId="";

  function centerOf(el){
    const r=el?.getBoundingClientRect?.();
    if(!r) return null;
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  }
  function cleanup(node,ms=760){setTimeout(()=>{try{node?.remove?.();}catch(_){}},ms);}
  function impact(point,kind){
    if(!layer||!point) return;
    const el=document.createElement("div");
    el.className=`attack-fx-impact ${kind||""}`.trim();
    el.style.left=`${point.x}px`;el.style.top=`${point.y}px`;
    layer.appendChild(el);cleanup(el,680);
  }
  function laser(from,to,kind){
    const dx=to.x-from.x,dy=to.y-from.y;
    const length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
    const beam=document.createElement("div");
    beam.className=`attack-fx-beam ${kind||""}`.trim();
    beam.style.left=`${from.x}px`;beam.style.top=`${from.y}px`;beam.style.width=`${length}px`;
    beam.style.transform=`rotate(${angle}deg) scaleX(.03)`;
    layer.appendChild(beam);cleanup(beam,650);
  }
  function lightning(from,to,kind){
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("class",`attack-fx-lightning ${kind||""}`.trim());
    const line=document.createElementNS("http://www.w3.org/2000/svg","polyline");
    const dx=to.x-from.x,dy=to.y-from.y;
    const len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len;
    const points=[];
    const steps=7;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const baseX=from.x+dx*t,baseY=from.y+dy*t;
      const edge=i===0||i===steps;
      const jitter=edge?0:((i%2?1:-1)*(5+Math.random()*10));
      points.push(`${(baseX+nx*jitter).toFixed(1)},${(baseY+ny*jitter).toFixed(1)}`);
    }
    line.setAttribute("points",points.join(" "));
    svg.appendChild(line);layer.appendChild(svg);cleanup(svg,700);
  }
  function emit(source,target,kind="laser",amount=0,face=null){
    const src=Number(source),dst=Number(target);
    if(!Number.isInteger(src)||!Number.isInteger(dst)||src===dst) return null;
    const event={id:`${Date.now().toString(36)}-${++combatFxSerial}`,source:src,target:dst,kind:String(kind||"laser"),amount:Number(amount)||0,face:face==null?null:Number(face),at:Date.now()};
    lastCombatFx=event;
    combatFxEvents.push(event);
    if(combatFxEvents.length>8) combatFxEvents.splice(0,combatFxEvents.length-8);
    play(event);
    return event;
  }

  function play(event){
    if(!layer||!event) return false;
    const id=String(event.id||"");
    if(id&&id===lastPlayedId) return false;
    if(id) lastPlayedId=id;
    const sourceIndex=Number(event.source),targetIndex=Number(event.target);
    if(!Number.isInteger(sourceIndex)||!Number.isInteger(targetIndex)||sourceIndex===targetIndex) return false;
    const source=document.getElementById(`playerCard${sourceIndex}`);
    const target=document.getElementById(`playerCard${targetIndex}`);
    const from=centerOf(source),to=centerOf(target);
    if(!from||!to) return false;
    const kind=String(event.kind||"laser");
    source?.classList.remove("attack-source-flash");
    void source?.offsetWidth;
    source?.classList.add("attack-source-flash");
    setTimeout(()=>source?.classList.remove("attack-source-flash"),420);
    if(kind==="lightning"||kind==="counter") lightning(from,to,kind);
    else laser(from,to,kind);
    setTimeout(()=>impact(to,kind),kind==="lightning"||kind==="counter"?120:210);
    return true;
  }
  window.WDAttackFx=Object.freeze({emit,play,getLastPlayedId:()=>lastPlayedId,reset(){lastPlayedId="";if(layer)layer.innerHTML="";}});
})();
