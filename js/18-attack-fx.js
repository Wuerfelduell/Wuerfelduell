(function(){
  "use strict";
  const layer=document.getElementById("attackFxLayer");
  let lastPlayedId="";

  function centerOf(el){
    const r=el?.getBoundingClientRect?.();
    if(!r) return null;
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  }
  function cleanup(node,ms=900){setTimeout(()=>{try{node?.remove?.();}catch(_){}},ms);}
  function knownStyle(id){
    const key=String(id||"classic");
    try{return ATTACK_FX_STYLES?.[key]?key:"classic";}catch(_){return "classic";}
  }
  function sourceStyle(index){
    try{return knownStyle(players?.[Number(index)]?.attackFx||"classic");}catch(_){return "classic";}
  }

  function impact(point,style="classic",variant=""){
    if(!layer||!point) return;
    const el=document.createElement("div");
    el.className=`attack-fx-impact fx-${style} ${variant||""}`.trim();
    el.style.left=`${point.x}px`;el.style.top=`${point.y}px`;
    layer.appendChild(el);cleanup(el,780);
  }

  function beam(from,to,style="classic",variant=""){
    const dx=to.x-from.x,dy=to.y-from.y;
    const length=Math.hypot(dx,dy),angle=Math.atan2(dy,dx)*180/Math.PI;
    const el=document.createElement("div");
    el.className=`attack-fx-beam fx-${style} ${variant||""}`.trim();
    el.style.left=`${from.x}px`;el.style.top=`${from.y}px`;el.style.width=`${length}px`;
    el.style.transform=`rotate(${angle}deg) scaleX(.03)`;
    layer.appendChild(el);cleanup(el,760);
  }

  function lightning(from,to,style="classic",variant=""){
    const svg=document.createElementNS("http://www.w3.org/2000/svg","svg");
    svg.setAttribute("class",`attack-fx-lightning fx-${style} ${variant||""}`.trim());
    const line=document.createElementNS("http://www.w3.org/2000/svg","polyline");
    const dx=to.x-from.x,dy=to.y-from.y;
    const len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len;
    const points=[];
    const steps=8;
    for(let i=0;i<=steps;i++){
      const t=i/steps;
      const baseX=from.x+dx*t,baseY=from.y+dy*t;
      const edge=i===0||i===steps;
      const jitter=edge?0:((i%2?1:-1)*(5+Math.random()*11));
      points.push(`${(baseX+nx*jitter).toFixed(1)},${(baseY+ny*jitter).toFixed(1)}`);
    }
    line.setAttribute("points",points.join(" "));
    svg.appendChild(line);layer.appendChild(svg);cleanup(svg,760);
  }

  function trailParticles(from,to,style,count=10){
    if(!layer) return;
    const dx=to.x-from.x,dy=to.y-from.y;
    for(let i=0;i<count;i++){
      const t=(i+1)/(count+1);
      const p=document.createElement("span");
      p.className=`attack-fx-particle fx-${style}`;
      p.style.left=`${from.x+dx*t}px`;p.style.top=`${from.y+dy*t}px`;
      p.style.setProperty("--fx-delay",`${Math.round(i*18)}ms`);
      p.style.setProperty("--fx-dx",`${Math.round((Math.random()-.5)*28)}px`);
      p.style.setProperty("--fx-dy",`${Math.round(-8-Math.random()*24)}px`);
      layer.appendChild(p);cleanup(p,900);
    }
  }

  function burst(point,style,count=10,chars=null){
    if(!layer||!point) return;
    for(let i=0;i<count;i++){
      const p=document.createElement("span");
      p.className=`attack-fx-burst fx-${style}`;
      if(chars?.length) p.textContent=chars[i%chars.length];
      p.style.left=`${point.x}px`;p.style.top=`${point.y}px`;
      const angle=(Math.PI*2*i/count)+(Math.random()-.5)*.4;
      const dist=28+Math.random()*44;
      p.style.setProperty("--fx-x",`${Math.cos(angle)*dist}px`);
      p.style.setProperty("--fx-y",`${Math.sin(angle)*dist}px`);
      p.style.setProperty("--fx-r",`${Math.round((Math.random()-.5)*300)}deg`);
      p.style.setProperty("--fx-delay",`${Math.round(Math.random()*70)}ms`);
      layer.appendChild(p);cleanup(p,1050);
    }
  }

  function ring(point,style){
    if(!layer||!point) return;
    const r=document.createElement("div");
    r.className=`attack-fx-ring fx-${style}`;
    r.style.left=`${point.x}px`;r.style.top=`${point.y}px`;
    layer.appendChild(r);cleanup(r,900);
  }

  function playStyled(from,to,style,variant){
    switch(style){
      case "lightning":
        lightning(from,to,"lightning",variant);burst(to,"lightning",7);break;
      case "flame":
        beam(from,to,"flame",variant);trailParticles(from,to,"flame",12);burst(to,"flame",9);break;
      case "venom":
        beam(from,to,"venom",variant);trailParticles(from,to,"venom",8);burst(to,"venom",8);break;
      case "blood":
        beam(from,to,"blood",variant);burst(to,"blood",11);break;
      case "jackpot":
        beam(from,to,"jackpot",variant);burst(to,"jackpot",12,["♠","♥","♦","♣"]);break;
      case "void":
        beam(from,to,"void",variant);ring(to,"void");burst(to,"void",8);break;
      case "confetti":
        beam(from,to,"confetti",variant);burst(to,"confetti",18,["◆","●","▲","■"]);break;
      case "frost":
        beam(from,to,"frost",variant);burst(to,"frost",12,["❄","✦"]);break;
      case "rift":
        lightning(from,to,"rift",variant);ring(to,"rift");burst(to,"rift",9);break;
      case "crown":
        lightning(from,to,"crown",variant);burst(to,"crown",12,["✦","♛","✧"]);break;
      default:
        if(variant==="lightning"||variant==="counter") lightning(from,to,"classic",variant);
        else beam(from,to,"classic",variant);
        break;
    }
  }

  function emit(source,target,kind="laser",amount=0,face=null){
    const src=Number(source),dst=Number(target);
    if(!Number.isInteger(src)||!Number.isInteger(dst)||src===dst) return null;
    const variant=String(kind||"laser");
    const style=sourceStyle(src);
    const event={id:`${Date.now().toString(36)}-${++combatFxSerial}`,source:src,target:dst,kind:variant,variant,style,amount:Number(amount)||0,face:face==null?null:Number(face),at:Date.now()};
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
    const variant=String(event.variant||event.kind||"laser");
    const style=knownStyle(event.style||((ATTACK_FX_STYLES?.[event.kind])?event.kind:"classic"));

    source?.classList.remove("attack-source-flash");
    void source?.offsetWidth;
    source?.classList.add("attack-source-flash",`fx-${style}`);
    setTimeout(()=>{source?.classList.remove("attack-source-flash",`fx-${style}`);},460);

    playStyled(from,to,style,variant);
    setTimeout(()=>impact(to,style,variant),style==="lightning"||style==="rift"||style==="crown"||variant==="lightning"||variant==="counter"?115:190);
    return true;
  }

  window.WDAttackFx=Object.freeze({emit,play,getLastPlayedId:()=>lastPlayedId,reset(){lastPlayedId="";if(layer)layer.innerHTML="";}});
})();
