(function(){
  "use strict";

  const domLayer=document.getElementById("attackFxLayer");
  if(!domLayer) return;

  // Canvas sits inside the existing attack FX layer; pointer-events remain disabled.
  const canvas=document.createElement("canvas");
  canvas.id="attackFxCanvasMain";
  canvas.setAttribute("aria-hidden","true");
  canvas.style.cssText="position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:1;";
  domLayer.appendChild(canvas);
  const ctx=canvas.getContext("2d");

  let activeLabFx=[];
  let activeKillFx=[];
  let lastPlayedId="";
  let lastEvent=null;

  function resize(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
      canvas.style.width=w+"px";canvas.style.height=h+"px";
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
  }

  function centerOf(el){
    const r=el?.getBoundingClientRect?.();
    if(!r) return null;
    return {x:r.left+r.width/2,y:r.top+r.height/2};
  }
  function centerOfCard(index){
    return centerOf(document.getElementById(`playerCard${Number(index)}`));
  }
  function knownStyle(id){
    const key=String(id||"classic");
    try{return ATTACK_FX_STYLES?.[key]?key:"classic";}catch(_){return "classic";}
  }
  function sourceStyle(index){
    try{return knownStyle(players?.[Number(index)]?.attackFx||"classic");}catch(_){return "classic";}
  }
  function easeOutCubic(t){return 1-Math.pow(1-t,3)}
  function easeInOut(t){return t<.5?2*t*t:1-Math.pow(-2*t+2,2)/2}
  function lerp(a,b,t){return a+(b-a)*t}
  function pointOn(from,to,t){return {x:lerp(from.x,to.x,t),y:lerp(from.y,to.y,t)}}

  function glowCircle(ctx,x,y,r,color,alpha=.8){
    const g=ctx.createRadialGradient(x,y,0,x,y,r);
    g.addColorStop(0,color);
    g.addColorStop(.28,color);
    g.addColorStop(1,'rgba(0,0,0,0)');
    ctx.globalAlpha=alpha;
    ctx.fillStyle=g;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();
    ctx.globalAlpha=1;
  }

  function drawArcShot(fx,t){
    const [c1,c2]=labFxColor('classic');
    const {from,to}=fx;
    const mx=(from.x+to.x)/2, my=(from.y+to.y)/2-42;
    const p=easeOutCubic(Math.min(1,t*1.25));
    ctx.save();
    ctx.lineCap='round';
    ctx.beginPath();
    ctx.moveTo(from.x,from.y);
    ctx.quadraticCurveTo(mx,my,lerp(from.x,to.x,p),lerp(from.y,to.y,p)-Math.sin(p*Math.PI)*42);
    ctx.strokeStyle=c2;ctx.lineWidth=7;ctx.globalAlpha=.18;ctx.stroke();
    ctx.strokeStyle=c1;ctx.lineWidth=2.2;ctx.globalAlpha=.92;ctx.stroke();
    const qx=lerp(from.x,to.x,p),qy=lerp(from.y,to.y,p)-Math.sin(p*Math.PI)*42;
    glowCircle(ctx,qx,qy,13,c1,.55);
    ctx.restore();
  }

  function drawLightning(fx,t){
    if(t>.72) return;
    const [c1,c2]=labFxColor('lightning');
    const {from,to}=fx;
    const dx=to.x-from.x,dy=to.y-from.y,len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len;
    ctx.save();ctx.lineCap='round';ctx.lineJoin='round';
    for(let pass=0;pass<2;pass++){
      ctx.beginPath();ctx.moveTo(from.x,from.y);
      const steps=10;
      for(let k=1;k<=steps;k++){
        const q=k/steps;
        const edge=k===steps;
        const jitter=edge?0:Math.sin((k+fx.seed)*8.31)*(6+(k%3)*3);
        ctx.lineTo(from.x+dx*q+nx*jitter,from.y+dy*q+ny*jitter);
      }
      ctx.strokeStyle=pass?c1:c2;ctx.lineWidth=pass?2.2:8;ctx.globalAlpha=pass?.95:.2;ctx.stroke();
    }
    glowCircle(ctx,to.x,to.y,32,c1,Math.max(0,.65-t*.5));
    ctx.restore();
  }

  function drawHellfire(fx,t){
    const [c1,c2]=labFxColor('flame');
    const p=easeInOut(Math.min(1,t*1.12));
    const pos=pointOn(fx.from,fx.to,p);
    const dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y;
    const len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;
    const nx=-uy,ny=ux;
    const ang=Math.atan2(dy,dx);

    ctx.save();
    ctx.globalCompositeOperation='lighter';

    // living flame trail: several tapering tongues, not circles
    for(let k=0;k<8;k++){
      const back=(k+1)*12;
      const sway=Math.sin(t*18+k*1.7)*5*(1-k/10);
      const x=pos.x-ux*back+nx*sway;
      const y=pos.y-uy*back+ny*sway;
      const h=20-k*1.7;
      const w=7-k*.45;

      const g=ctx.createLinearGradient(x,y,x-ux*h,y-uy*h);
      g.addColorStop(0,`rgba(255,80,90,${.34*(1-k/9)})`);
      g.addColorStop(.45,`rgba(235,10,36,${.28*(1-k/9)})`);
      g.addColorStop(1,'rgba(90,0,18,0)');

      ctx.save();
      ctx.translate(x,y);
      ctx.rotate(ang+Math.PI);
      ctx.fillStyle=g;
      ctx.beginPath();
      ctx.moveTo(-w,0);
      ctx.bezierCurveTo(-w*1.2,-h*.25,-w*.45,-h*.55,0,-h);
      ctx.bezierCurveTo(w*.45,-h*.58,w*1.1,-h*.26,w,0);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
    }

    // flaming core projectile
    glowCircle(ctx,pos.x,pos.y,18,c1,.66);
    ctx.save();
    ctx.translate(pos.x,pos.y);
    ctx.rotate(ang);
    ctx.fillStyle=c1;
    ctx.globalAlpha=.92;
    ctx.beginPath();
    ctx.moveTo(18,0);
    ctx.bezierCurveTo(6,-8,-7,-8,-17,-2);
    ctx.bezierCurveTo(-10,0,-7,7,3,7);
    ctx.bezierCurveTo(10,6,14,3,18,0);
    ctx.fill();
    ctx.restore();

    ctx.restore();

    if(t>.69){
      const e=(t-.69)/.31;
      impactFlash(fx.to.x,fx.to.y,c1,e,58,.45);
      impactRing(fx.to.x,fx.to.y,c2,e,58,3,.62);
      impactSparks(fx.to.x,fx.to.y,c1,e,11,58);
    }
  }
  function drawVenom(fx,t){
    const [c1,c2]=labFxColor('venom');
    const p=easeOutCubic(Math.min(1,t*1.08));
    const pos=pointOn(fx.from,fx.to,p);
    const dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y;
    const len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;
    const nx=-uy,ny=ux;

    ctx.save();
    ctx.globalCompositeOperation='lighter';

    // poison trail hanging behind the projectile
    for(let k=0;k<10;k++){
      const back=(k+1)*13;
      const lateral=Math.sin(k*1.8+fx.seed)*5;
      const x=pos.x-ux*back+nx*lateral;
      const y=pos.y-uy*back+ny*lateral + k*.9;
      const a=Math.max(0,.24-k*.018);
      glowCircle(ctx,x,y,7-k*.22,c1,a);

      // droplet tail downward
      ctx.fillStyle=`rgba(70,220,90,${a*.8})`;
      ctx.beginPath();
      ctx.ellipse(x,y+4,2.2,5.5,0,0,Math.PI*2);
      ctx.fill();
    }

    glowCircle(ctx,pos.x,pos.y,15,c1,.58);
    ctx.fillStyle=c2;
    ctx.globalAlpha=.88;
    ctx.beginPath();
    ctx.ellipse(pos.x,pos.y,9,12,Math.sin(t*8)*.18,0,Math.PI*2);
    ctx.fill();

    // glossy toxic center
    ctx.fillStyle='rgba(220,255,210,.35)';
    ctx.beginPath();
    ctx.ellipse(pos.x-2.5,pos.y-3.5,3,4,0,0,Math.PI*2);
    ctx.fill();
    ctx.restore();

    if(t>.66){
      const e=(t-.66)/.34;
      impactFlash(fx.to.x,fx.to.y,c1,e,38,.3);
      impactRing(fx.to.x,fx.to.y,c2,e,38,2.2,.48);
      for(let k=0;k<8;k++){
        const a=k*Math.PI*2/8+fx.seed;
        const d=e*(20+(k%3)*8);
        glowCircle(ctx,fx.to.x+Math.cos(a)*d,fx.to.y+Math.sin(a)*d,6,c1,(1-e)*.26);
      }
    }
  }
  function drawBloodSlash(fx,t){
    const [c1,c2]=labFxColor('blood');
    if(t<.18) return;
    const e=Math.min(1,(t-.18)/.48);
    const fade=1-Math.max(0,(t-.72)/.28);
    const cx=fx.to.x,cy=fx.to.y;

    ctx.save();
    ctx.translate(cx,cy);
    ctx.rotate(-.68);
    ctx.lineCap='round';
    ctx.lineJoin='round';

    const scratches=[
      {off:-17,phase:.2},
      {off:0,phase:1.1},
      {off:17,phase:2.0}
    ];

    scratches.forEach((sc,idx)=>{
      const x0=-72;
      const x1=lerp(-72,74,e);
      const y0=sc.off;
      const mid1=sc.off + Math.sin(sc.phase+e*3.4)*6;
      const mid2=sc.off + Math.sin(sc.phase*1.7+e*4.2)*9;

      ctx.beginPath();
      ctx.moveTo(x0,y0);
      ctx.bezierCurveTo(-35,mid1,12,mid2,x1,sc.off+Math.sin(sc.phase+1.8)*4);

      ctx.strokeStyle=c2;
      ctx.lineWidth=10;
      ctx.globalAlpha=.16*fade;
      ctx.stroke();

      ctx.strokeStyle=c1;
      ctx.lineWidth=2.5;
      ctx.globalAlpha=.94*fade;
      ctx.stroke();
    });

    ctx.restore();

    if(t>.48){
      const q=(t-.48)/.52;
      impactSparks(cx,cy,c1,q,8,42);
      impactFlash(cx,cy,c2,q,28,.18);
    }
  }
  function drawRoyalBurst(fx,t){
    const [c1,c2]=labFxColor('jackpot');
    const p=easeOutCubic(Math.min(1,t*1.02));
    const pos=pointOn(fx.from,fx.to,p);
    const suits=['♠','♥','♦','♣'];

    ctx.save();
    ctx.font='bold 24px system-ui';
    ctx.textAlign='center';
    ctx.textBaseline='middle';
    ctx.fillStyle=c1;
    ctx.globalAlpha=.9;
    ctx.translate(pos.x,pos.y);
    ctx.rotate(t*9);
    ctx.fillText(suits[Math.floor(fx.seed)%4],0,0);
    ctx.restore();

    if(t>.55){
      const e=(t-.55)/.45;
      ctx.font='bold 22px system-ui';
      ctx.textAlign='center';
      for(let k=0;k<12;k++){
        const a=k*Math.PI*2/12 + (k%2)*.12;
        const d=e*(38+(k%4)*13);
        ctx.fillStyle=k%2?c1:c2;
        ctx.globalAlpha=(1-e)*.95;
        ctx.fillText(suits[k%4],fx.to.x+Math.cos(a)*d,fx.to.y+Math.sin(a)*d);
      }
      ctx.globalAlpha=1;
      impactFlash(fx.to.x,fx.to.y,c1,e,58,.42);
      impactRing(fx.to.x,fx.to.y,c1,e,70,2.4,.72);
      impactSparks(fx.to.x,fx.to.y,c2,e,14,68);
    }
  }
  function drawVoid(fx,t){
    const [c1,c2]=labFxColor('void');
    const p=easeInOut(Math.min(1,t/.62));
    const pos=pointOn(fx.from,fx.to,p);
    glowCircle(ctx,pos.x,pos.y,22,c2,.62);

    if(t>.38){
      const e=Math.min(1,(t-.38)/.62);
      ctx.save();
      ctx.translate(fx.to.x,fx.to.y);

      // large rotating elliptical tear
      ctx.strokeStyle=c1;
      ctx.globalAlpha=(1-e)*.95;
      ctx.lineWidth=3.2;
      ctx.beginPath();
      ctx.ellipse(0,0,14+e*54,30+e*22,e*2.8,0,Math.PI*2);
      ctx.stroke();

      ctx.strokeStyle=c2;
      ctx.lineWidth=10;
      ctx.globalAlpha=(1-e)*.14;
      ctx.stroke();

      // inner collapsing ring
      ctx.strokeStyle=c2;
      ctx.lineWidth=1.8;
      ctx.globalAlpha=(1-e)*.55;
      ctx.beginPath();
      ctx.ellipse(0,0,8+e*26,18+e*12,-e*2.1,0,Math.PI*2);
      ctx.stroke();

      ctx.restore();

      impactFlash(fx.to.x,fx.to.y,c1,e,62,.34);
      impactRing(fx.to.x,fx.to.y,c2,e,76,2.6,.66);
    }
  }
  function drawConfetti(fx,t){
    const p=easeOutCubic(Math.min(1,t/.48));
    const pos=pointOn(fx.from,fx.to,p);
    const cols=['#ff78d7','#6de8ff','#ffe46f','#8cff78'];

    // moving party capsule, no white guide line
    ctx.save();
    ctx.translate(pos.x,pos.y);
    ctx.rotate(t*10);
    ctx.fillStyle=cols[Math.floor(fx.seed)%cols.length];
    ctx.globalAlpha=.9;
    ctx.fillRect(-7,-4,14,8);
    ctx.fillStyle='#ffffff';
    ctx.globalAlpha=.35;
    ctx.fillRect(-2,-4,4,8);
    ctx.restore();

    if(t>.45){
      const e=(t-.45)/.55;
      for(let k=0;k<20;k++){
        const a=k*.79+fx.seed;
        const d=e*(34+(k%6)*10);
        ctx.save();
        ctx.translate(
          fx.to.x+Math.cos(a)*d,
          fx.to.y+Math.sin(a)*d+e*e*38
        );
        ctx.rotate(a+e*8);
        ctx.globalAlpha=(1-e)*.96;
        ctx.fillStyle=cols[k%cols.length];
        ctx.fillRect(-3,-6,6,12);
        ctx.restore();
      }
      impactFlash(fx.to.x,fx.to.y,'#ffffff',e,34,.25);
      impactRing(fx.to.x,fx.to.y,cols[0],e,42,1.7,.42);
    }
  }
  function drawFrost(fx,t){
    const [c1,c2]=labFxColor('frost');
    const p=easeOutCubic(Math.min(1,t/.62));
    const pos=pointOn(fx.from,fx.to,p);
    const dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y;
    const ang=Math.atan2(dy,dx);

    ctx.save();
    ctx.translate(pos.x,pos.y);
    ctx.rotate(ang);

    // long spear body
    const spearLen=46;
    const shaft=ctx.createLinearGradient(-spearLen,0,16,0);
    shaft.addColorStop(0,'rgba(80,190,240,0)');
    shaft.addColorStop(.25,'rgba(120,220,255,.55)');
    shaft.addColorStop(.72,'rgba(220,255,255,.9)');
    shaft.addColorStop(1,'rgba(255,255,255,.98)');
    ctx.fillStyle=shaft;
    ctx.globalAlpha=.95;
    ctx.beginPath();
    ctx.moveTo(20,0);
    ctx.lineTo(2,-7);
    ctx.lineTo(-34,-4);
    ctx.lineTo(-44,0);
    ctx.lineTo(-34,4);
    ctx.lineTo(2,7);
    ctx.closePath();
    ctx.fill();

    // crystalline ridge
    ctx.strokeStyle=c2;
    ctx.lineWidth=1.5;
    ctx.globalAlpha=.7;
    ctx.beginPath();
    ctx.moveTo(-30,0);
    ctx.lineTo(8,0);
    ctx.stroke();

    ctx.restore();

    if(t>.56){
      const e=(t-.56)/.44;
      impactFlash(fx.to.x,fx.to.y,c1,e,42,.34);
      impactRing(fx.to.x,fx.to.y,c2,e,44,2,.52);
      impactShards(fx.to.x,fx.to.y,c1,e,12,62);
    }
  }
  function drawRiftTear(fx,t){
    const [c1,c2]=labFxColor('rift');
    if(t<.12) return;
    const e=Math.min(1,(t-.12)/.55);
    ctx.save();ctx.translate(fx.to.x,fx.to.y);
    ctx.strokeStyle=c1;ctx.lineWidth=3;ctx.globalAlpha=Math.max(0,1-Math.max(0,t-.72)/.28);
    ctx.beginPath();ctx.moveTo(0,-e*48);
    for(let k=1;k<=7;k++){
      const y=-48*e+k*(96*e/7),x=Math.sin(k*2.8+fx.seed)*8;
      ctx.lineTo(x,y);
    }
    ctx.stroke();
    ctx.strokeStyle=c2;ctx.lineWidth=8;ctx.globalAlpha=.12;ctx.stroke();
    ctx.restore();
  }

  function drawCrownfall(fx,t){
    const [c1,c2]=labFxColor('crown');
    const e=easeOutCubic(Math.min(1,t/.7));
    const y=lerp(fx.to.y-100,fx.to.y-12,e);
    ctx.save();ctx.font='bold 34px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=c1;ctx.shadowColor=c2;ctx.shadowBlur=16;ctx.globalAlpha=.95;ctx.fillText('♛',fx.to.x,y);ctx.restore();
    if(t>.58){
      const q=(t-.58)/.42;
      ctx.strokeStyle=c1;ctx.lineWidth=3;ctx.globalAlpha=(1-q)*.8;
      ctx.beginPath();ctx.arc(fx.to.x,fx.to.y,8+q*58,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;
    }
  }


  function impactRing(x,y,color,e,maxR=52,width=2.4,alpha=.75){
    if(e<=0||e>=1) return;
    ctx.save();
    ctx.globalAlpha=(1-e)*alpha;
    ctx.strokeStyle=color;
    ctx.lineWidth=width*(1-e*.35);
    ctx.beginPath();
    ctx.arc(x,y,5+e*maxR,0,Math.PI*2);
    ctx.stroke();
    ctx.restore();
  }

  function impactFlash(x,y,color,e,size=44,alpha=.32){
    if(e<=0||e>=1) return;
    glowCircle(ctx,x,y,size*(.42+e*.7),color,(1-e)*alpha);
  }

  function impactSparks(x,y,color,e,count=8,spread=48){
    if(e<=0||e>=1) return;
    ctx.save();
    ctx.lineCap='round';
    for(let k=0;k<count;k++){
      const a=(Math.PI*2/count)*k + .15*Math.sin(k*5.1);
      const d=e*spread*(.72+(k%3)*.11);
      ctx.strokeStyle=color;
      ctx.globalAlpha=(1-e)*(.82-(k%2)*.14);
      ctx.lineWidth=k%3===0?2.3:1.35;
      ctx.beginPath();
      ctx.moveTo(x+Math.cos(a)*d*.28,y+Math.sin(a)*d*.28);
      ctx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);
      ctx.stroke();
    }
    ctx.restore();
  }

  function impactShards(x,y,color,e,count=8,spread=44){
    if(e<=0||e>=1) return;
    ctx.save();
    for(let k=0;k<count;k++){
      const a=(Math.PI*2/count)*k+.23;
      const d=e*spread*(.72+(k%2)*.16);
      const px=x+Math.cos(a)*d;
      const py=y+Math.sin(a)*d;
      ctx.save();
      ctx.translate(px,py);
      ctx.rotate(a+e*2.4);
      ctx.globalAlpha=(1-e)*.74;
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.moveTo(0,-5.5);ctx.lineTo(2.5,4.5);ctx.lineTo(-2.5,4.5);ctx.closePath();
      ctx.fill();
      ctx.restore();
    }
    ctx.restore();
  }

  function drawImpactForStyle(fx,t){
    const [c1,c2]=labFxColor(fx.style);
    const x=fx.to.x,y=fx.to.y;
    let e=0;

    switch(fx.style){
      case 'lightning':
        e=Math.max(0,(t-.48)/.52);
        impactFlash(x,y,c1,e,58,.48);
        impactRing(x,y,c1,e,64,2.6,.78);
        impactSparks(x,y,c1,e,12,66);
        break;

      case 'flame':
        e=Math.max(0,(t-.67)/.33);
        impactFlash(x,y,c1,e,54,.42);
        impactRing(x,y,c2,e,52,3,.6);
        impactSparks(x,y,c2,e,10,52);
        break;

      case 'venom':
        e=Math.max(0,(t-.66)/.34);
        impactFlash(x,y,c1,e,36,.28);
        impactRing(x,y,c2,e,36,2.3,.48);
        for(let k=0;k<7&&e>0&&e<1;k++){
          const a=k*Math.PI*2/7+fx.seed;
          const d=e*(22+(k%3)*7);
          glowCircle(ctx,x+Math.cos(a)*d,y+Math.sin(a)*d,5.5,c1,(1-e)*.24);
        }
        break;

      case 'blood':
        e=Math.max(0,(t-.46)/.54);
        impactFlash(x,y,c1,e,31,.24);
        impactSparks(x,y,c1,e,7,38);
        break;

      case 'jackpot':
        e=Math.max(0,(t-.6)/.4);
        impactFlash(x,y,c1,e,44,.36);
        impactRing(x,y,c1,e,50,2.2,.65);
        impactSparks(x,y,c2,e,12,52);
        break;

      case 'void':
        e=Math.max(0,(t-.56)/.44);
        impactFlash(x,y,c1,e,48,.32);
        impactRing(x,y,c2,e,58,3,.68);
        impactRing(x,y,c1,Math.min(1,e*1.25),34,1.4,.42);
        break;

      case 'confetti':
        e=Math.max(0,(t-.46)/.54);
        impactFlash(x,y,'#ffffff',e,30,.26);
        impactRing(x,y,'#ffffff',e,34,1.7,.38);
        break;

      case 'frost':
        e=Math.max(0,(t-.55)/.45);
        impactFlash(x,y,c1,e,38,.32);
        impactRing(x,y,c2,e,42,2,.52);
        impactShards(x,y,c1,e,10,54);
        break;

      case 'rift':
        e=Math.max(0,(t-.48)/.52);
        impactFlash(x,y,c2,e,44,.3);
        impactRing(x,y,c1,e,48,2.3,.58);
        impactSparks(x,y,c1,e,8,44);
        break;

      case 'crown':
        e=Math.max(0,(t-.52)/.48);
        impactFlash(x,y,c1,e,72,.5);
        impactRing(x,y,c1,e,78,3.4,.9);
        impactRing(x,y,c2,Math.min(1,e*1.15),54,2,.62);
        impactSparks(x,y,c2,e,12,68);
        break;

      default:
        e=Math.max(0,(t-.68)/.32);
        impactFlash(x,y,c1,e,40,.32);
        impactRing(x,y,c2,e,44,2.2,.52);
        impactSparks(x,y,c1,e,7,40);
        break;
    }
  }

  function drawLabFx(fx,now){
    const t=(now-fx.start)/fx.duration;
    if(t>=1) return false;
    switch(fx.style){
      case 'lightning':drawLightning(fx,t);break;
      case 'flame':drawHellfire(fx,t);break;
      case 'venom':drawVenom(fx,t);break;
      case 'blood':drawBloodSlash(fx,t);break;
      case 'jackpot':drawRoyalBurst(fx,t);break;
      case 'void':drawVoid(fx,t);break;
      case 'confetti':drawConfetti(fx,t);break;
      case 'frost':drawFrost(fx,t);break;
      case 'rift':drawRiftTear(fx,t);break;
      case 'crown':drawCrownfall(fx,t);break;
      default:drawArcShot(fx,t);break;
    }
    drawImpactForStyle(fx,t);
    return true;
  }


  // -----------------------------
  // Paired Kill FX + tiny WebAudio stingers
  // -----------------------------
  function ensureAudio(){
    try{
      if(!audioCtx) audioCtx=new (window.AudioContext||window.webkitAudioContext)();
      if(audioCtx.state==='suspended') audioCtx.resume();
      return audioCtx;
    }catch(_err){
      return null;
    }
  }

  function tone(freq,start,dur,type='sine',gain=.045,endFreq=null){
    const ac=ensureAudio();
    if(!ac) return;
    const o=ac.createOscillator();
    const g=ac.createGain();
    o.type=type;
    o.frequency.setValueAtTime(freq,ac.currentTime+start);
    if(endFreq) o.frequency.exponentialRampToValueAtTime(Math.max(30,endFreq),ac.currentTime+start+dur);
    g.gain.setValueAtTime(.0001,ac.currentTime+start);
    g.gain.exponentialRampToValueAtTime(gain,ac.currentTime+start+.01);
    g.gain.exponentialRampToValueAtTime(.0001,ac.currentTime+start+dur);
    o.connect(g);g.connect(ac.destination);
    o.start(ac.currentTime+start);o.stop(ac.currentTime+start+dur+.03);
  }

  function noiseBurst(start,dur,gain=.025,highpass=500){
    const ac=ensureAudio();
    if(!ac) return;
    const len=Math.max(1,Math.floor(ac.sampleRate*dur));
    const buffer=ac.createBuffer(1,len,ac.sampleRate);
    const data=buffer.getChannelData(0);
    for(let i=0;i<len;i++) data[i]=(Math.random()*2-1)*(1-i/len);
    const src=ac.createBufferSource();
    const filter=ac.createBiquadFilter();
    const g=ac.createGain();
    filter.type='highpass';filter.frequency.value=highpass;
    g.gain.value=gain;
    src.buffer=buffer;src.connect(filter);filter.connect(g);g.connect(ac.destination);
    src.start(ac.currentTime+start);
  }

  function playKillSound(style){
    switch(style){
      case 'lightning':
        noiseBurst(0,.11,.055,1200);tone(150,.01,.16,'sawtooth',.045,55);tone(2600,.02,.08,'square',.012,900);break;
      case 'flame':
        noiseBurst(0,.22,.035,120);tone(95,0,.28,'sawtooth',.04,42);tone(170,.03,.2,'triangle',.018,65);break;
      case 'venom':
        tone(180,0,.22,'sine',.026,74);tone(420,.03,.16,'triangle',.014,160);noiseBurst(.02,.14,.012,250);break;
      case 'blood':
        noiseBurst(0,.12,.042,800);tone(115,.03,.17,'triangle',.03,58);break;
      case 'jackpot':
        tone(660,0,.12,'triangle',.025);tone(880,.08,.14,'triangle',.03);tone(1320,.17,.18,'sine',.025);break;
      case 'void':
        tone(120,0,.42,'sine',.045,38);tone(62,.06,.48,'sawtooth',.028,31);break;
      case 'confetti':
        tone(520,0,.08,'square',.018);tone(760,.07,.09,'square',.018);noiseBurst(.06,.12,.018,1500);break;
      case 'frost':
        tone(1480,0,.16,'sine',.026,840);tone(2100,.02,.12,'triangle',.018,1100);noiseBurst(.08,.1,.022,1800);break;
      case 'rift':
        tone(155,0,.34,'sine',.032,50);tone(580,.04,.3,'triangle',.018,120);break;
      case 'crown':
        tone(392,0,.14,'triangle',.026);tone(587,.06,.18,'triangle',.03);tone(784,.13,.22,'sine',.024);noiseBurst(.17,.08,.012,1100);break;
      default:
        tone(260,0,.15,'triangle',.025,110);noiseBurst(.05,.08,.016,900);break;
    }
  }

  function addKillFx(style,source,target,preview=false){
    const to=centerOfCard(target);
    if(!to) return;
    const card=document.getElementById(`playerCard${target}`);
    const r=card?.getBoundingClientRect?.();
    activeKillFx.push({
      style:String(style||'classic'),
      source:Number(source),target:Number(target),
      x:to.x,y:to.y,
      w:r?.width||170,h:r?.height||110,
      start:performance.now(),
      duration:{
        lightning:820,flame:1050,venom:1050,blood:820,jackpot:1150,
        void:1200,confetti:1150,frost:1000,rift:1100,crown:1250
      }[style]||900,
      seed:Math.random()*999,
      preview
    });
    playKillSound(String(style||'classic'));

    if(card){
      card.classList.remove('lab-kill-hit');
      void card.offsetWidth;
      card.classList.add('lab-kill-hit');
      setTimeout(()=>card.classList.remove('lab-kill-hit'),420);
    }
  }


  function killArc(fx,t){
    const [c1,c2]=labFxColor('classic');
    const e=Math.min(1,t/.82);
    impactFlash(fx.x,fx.y,c1,e,74,.42);
    impactRing(fx.x,fx.y,c2,e,90,3,.7);
    impactSparks(fx.x,fx.y,c1,e,14,92);
    if(t<.42){
      ctx.save();
      ctx.strokeStyle=c1;ctx.lineWidth=4;ctx.globalAlpha=(.42-t)/.42;
      ctx.beginPath();ctx.moveTo(fx.x-52,fx.y+36);ctx.quadraticCurveTo(fx.x,fx.y-70,fx.x+54,fx.y-24);ctx.stroke();
      ctx.restore();
    }
  }

  function killLightning(fx,t){
    const [c1,c2]=labFxColor('lightning');
    const fade=Math.max(0,1-t);
    for(let b=0;b<4;b++){
      ctx.save();ctx.strokeStyle=b===0?c1:c2;ctx.lineWidth=b===0?4:2;ctx.globalAlpha=fade*.9;
      ctx.beginPath();ctx.moveTo(fx.x+(b-1.5)*18,fx.y-140);
      for(let k=1;k<=8;k++){
        const q=k/8;
        ctx.lineTo(fx.x+(b-1.5)*12+Math.sin(k*4.2+fx.seed+b)*18,fx.y-140+q*150);
      }
      ctx.stroke();ctx.restore();
    }
    const e=Math.min(1,t/.75);
    impactFlash(fx.x,fx.y,c1,e,100,.56);
    impactRing(fx.x,fx.y,c1,e,100,3,.75);
    impactSparks(fx.x,fx.y,c1,e,18,110);
  }

  function killFlame(fx,t){
    const [c1,c2]=labFxColor('flame');
    const rise=Math.min(1,t/.82);
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let k=0;k<18;k++){
      const lane=(k%6)-2.5;
      const wave=Math.sin(fx.seed+k*1.9+t*12)*8;
      const x=fx.x+lane*(fx.w*.13)+wave;
      const base=fx.y+fx.h*.35-(k%3)*8;
      const h=(26+(k%5)*11)*(0.7+rise*.9);
      const y=base-rise*(20+(k%4)*12);
      const grad=ctx.createLinearGradient(x,y+8,x,y-h);
      grad.addColorStop(0,'rgba(120,0,18,0)');
      grad.addColorStop(.25,`rgba(220,8,35,${.24*(1-t*.5)})`);
      grad.addColorStop(.62,`rgba(255,50,66,${.31*(1-t*.45)})`);
      grad.addColorStop(1,'rgba(255,190,195,0)');
      ctx.fillStyle=grad;
      ctx.beginPath();ctx.moveTo(x-7,y+8);
      ctx.bezierCurveTo(x-10,y-h*.3,x-3,y-h*.65,x+wave*.25,y-h);
      ctx.bezierCurveTo(x+7,y-h*.58,x+10,y-h*.25,x+7,y+8);ctx.closePath();ctx.fill();
    }
    ctx.restore();
    const e=Math.max(0,(t-.45)/.55);
    impactRing(fx.x,fx.y,c2,e,105,3,.6);impactSparks(fx.x,fx.y,c1,e,16,92);
  }

  function killVenom(fx,t){
    const [c1,c2]=labFxColor('venom');
    const e=Math.min(1,t/.85);
    impactFlash(fx.x,fx.y,c1,e,68,.3);
    for(let k=0;k<16;k++){
      const a=k*Math.PI*2/16+fx.seed;
      const d=e*(28+(k%5)*13);
      const x=fx.x+Math.cos(a)*d,y=fx.y+Math.sin(a)*d;
      glowCircle(ctx,x,y,8+(k%3)*2,c1,(1-e)*.36);
      ctx.fillStyle=`rgba(60,210,85,${(1-e)*.34})`;
      ctx.beginPath();ctx.ellipse(x,y+e*24,3,9,0,0,Math.PI*2);ctx.fill();
    }
    impactRing(fx.x,fx.y,c2,e,82,2.4,.5);
  }

  function killBlood(fx,t){
    const [c1,c2]=labFxColor('blood');
    const e=Math.min(1,t/.62),fade=1-Math.max(0,(t-.62)/.38);
    ctx.save();ctx.translate(fx.x,fx.y);ctx.rotate(-.7);ctx.lineCap='round';
    [-24,0,24].forEach((off,i)=>{
      ctx.beginPath();ctx.moveTo(-92,off);
      ctx.bezierCurveTo(-50,off+8*Math.sin(i+fx.seed),10,off-12*Math.cos(i+fx.seed),lerp(-92,96,e),off+4*Math.sin(i*3));
      ctx.strokeStyle=c2;ctx.lineWidth=12;ctx.globalAlpha=.14*fade;ctx.stroke();
      ctx.strokeStyle=c1;ctx.lineWidth=3.2;ctx.globalAlpha=.96*fade;ctx.stroke();
    });
    ctx.restore();
    const q=Math.max(0,(t-.35)/.65);impactSparks(fx.x,fx.y,c1,q,14,78);impactFlash(fx.x,fx.y,c2,q,52,.23);
  }

  function killJackpot(fx,t){
    const [c1,c2]=labFxColor('jackpot');
    const e=Math.min(1,t/.95),suits=['♠','♥','♦','♣'];
    ctx.save();ctx.textAlign='center';ctx.textBaseline='middle';ctx.font='bold 28px system-ui';
    for(let k=0;k<24;k++){
      const a=k*Math.PI*2/24+fx.seed;
      const d=e*(42+(k%6)*16);
      ctx.fillStyle=k%2?c1:c2;ctx.globalAlpha=(1-e)*.95;
      ctx.fillText(suits[k%4],fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d);
    }
    ctx.restore();
    impactFlash(fx.x,fx.y,c1,e,92,.42);impactRing(fx.x,fx.y,c1,e,118,3,.75);
  }

  function killVoid(fx,t){
    const [c1,c2]=labFxColor('void');
    const e=Math.min(1,t/.95);
    ctx.save();ctx.translate(fx.x,fx.y);
    ctx.fillStyle=`rgba(5,0,12,${.72*Math.sin(Math.min(1,e)*Math.PI)})`;
    ctx.beginPath();ctx.ellipse(0,0,12+e*76,20+e*62,e*2.4,0,Math.PI*2);ctx.fill();
    ctx.strokeStyle=c1;ctx.lineWidth=4;ctx.globalAlpha=(1-e)*.9;
    ctx.beginPath();ctx.ellipse(0,0,20+e*92,34+e*72,-e*2.1,0,Math.PI*2);ctx.stroke();
    ctx.restore();
    impactRing(fx.x,fx.y,c2,e,120,2.6,.6);
  }

  function killConfetti(fx,t){
    const e=Math.min(1,t/.98),cols=['#ff78d7','#6de8ff','#ffe46f','#8cff78'];
    for(let k=0;k<34;k++){
      const a=k*.61+fx.seed;
      const d=e*(40+(k%8)*14);
      ctx.save();ctx.translate(fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d+e*e*44);
      ctx.rotate(a+e*10);ctx.globalAlpha=(1-e)*.96;ctx.fillStyle=cols[k%4];
      ctx.fillRect(-3,-7,6,14);ctx.restore();
    }
    impactFlash(fx.x,fx.y,'#ffffff',e,62,.26);impactRing(fx.x,fx.y,cols[0],e,96,2,.5);
  }

  function killFrost(fx,t){
    const [c1,c2]=labFxColor('frost');
    const e=Math.min(1,t/.84);
    impactFlash(fx.x,fx.y,c1,e,82,.38);
    impactRing(fx.x,fx.y,c2,e,94,2.5,.58);
    impactShards(fx.x,fx.y,c1,e,22,102);
    if(t<.48){
      ctx.save();ctx.translate(fx.x,fx.y);ctx.rotate(-Math.PI/2);
      ctx.fillStyle=c1;ctx.globalAlpha=1-t/.5;
      ctx.beginPath();ctx.moveTo(74,0);ctx.lineTo(18,-12);ctx.lineTo(-54,-5);ctx.lineTo(-70,0);ctx.lineTo(-54,5);ctx.lineTo(18,12);ctx.closePath();ctx.fill();
      ctx.restore();
    }
  }

  function killRift(fx,t){
    const [c1,c2]=labFxColor('rift');
    const e=Math.min(1,t/.9);
    ctx.save();ctx.translate(fx.x,fx.y);
    ctx.strokeStyle=c1;ctx.lineWidth=5;ctx.globalAlpha=1-e;
    ctx.beginPath();ctx.moveTo(0,-e*95);
    for(let k=1;k<=10;k++) ctx.lineTo(Math.sin(k*3+fx.seed)*12,-95*e+k*(190*e/10));
    ctx.stroke();ctx.restore();
    impactFlash(fx.x,fx.y,c2,e,72,.34);impactRing(fx.x,fx.y,c1,e,106,3,.65);impactSparks(fx.x,fx.y,c1,e,13,82);
  }

  function killCrown(fx,t){
    const [c1,c2]=labFxColor('crown');
    const fall=easeOutCubic(Math.min(1,t/.56));
    const y=lerp(fx.y-180,fx.y-8,fall);
    ctx.save();ctx.font='bold 58px system-ui';ctx.textAlign='center';ctx.textBaseline='middle';
    ctx.fillStyle=c1;ctx.shadowColor=c2;ctx.shadowBlur=24;ctx.globalAlpha=.98;ctx.fillText('♛',fx.x,y);ctx.restore();
    const e=Math.max(0,(t-.42)/.58);
    impactFlash(fx.x,fx.y,c1,e,108,.55);impactRing(fx.x,fx.y,c1,e,132,4,.92);
    impactRing(fx.x,fx.y,c2,Math.min(1,e*1.18),92,2.2,.64);impactSparks(fx.x,fx.y,c2,e,18,108);
  }

  function drawKillFx(fx,now){
    const t=(now-fx.start)/fx.duration;
    if(t>=1) return false;
    switch(fx.style){
      case 'lightning':killLightning(fx,t);break;
      case 'flame':killFlame(fx,t);break;
      case 'venom':killVenom(fx,t);break;
      case 'blood':killBlood(fx,t);break;
      case 'jackpot':killJackpot(fx,t);break;
      case 'void':killVoid(fx,t);break;
      case 'confetti':killConfetti(fx,t);break;
      case 'frost':killFrost(fx,t);break;
      case 'rift':killRift(fx,t);break;
      case 'crown':killCrown(fx,t);break;
      default:killArc(fx,t);break;
    }
    return true;
  }




  function makeFxEvent(event){
    const sourceIndex=Number(event.source),targetIndex=Number(event.target);
    const from=centerOfCard(sourceIndex),to=centerOfCard(targetIndex);
    if(!from||!to) return null;
    const style=knownStyle(event.style||sourceStyle(sourceIndex));
    return {
      id:String(event.id||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`),
      source:sourceIndex,target:targetIndex,
      style,
      kind:String(event.kind||event.variant||"laser"),
      amount:Number(event.amount)||0,
      face:event.face==null?null:Number(event.face),
      from,to,start:performance.now(),duration:760,
      seed:Math.random()*999
    };
  }

  function play(event){
    if(!event) return false;
    const id=String(event.id||"");
    if(id&&id===lastPlayedId) return false;
    const fx=makeFxEvent(event);
    if(!fx) return false;
    if(id) lastPlayedId=id;
    lastEvent={...event,style:fx.style};
    activeLabFx.push(fx);

    const source=document.getElementById(`playerCard${fx.source}`);
    source?.classList.remove("attack-source-flash");
    void source?.offsetWidth;
    source?.classList.add("attack-source-flash",`fx-${fx.style}`);
    setTimeout(()=>source?.classList.remove("attack-source-flash",`fx-${fx.style}`),460);
    return true;
  }

  function emit(source,target,kind="laser",amount=0,face=null){
    const src=Number(source),dst=Number(target);
    if(!Number.isInteger(src)||!Number.isInteger(dst)||src===dst) return null;
    const style=sourceStyle(src);
    const event={
      id:`${Date.now().toString(36)}-${++combatFxSerial}`,
      source:src,target:dst,kind:String(kind||"laser"),variant:String(kind||"laser"),
      style,amount:Number(amount)||0,face:face==null?null:Number(face),at:Date.now()
    };
    lastCombatFx=event;
    combatFxEvents.push(event);
    if(combatFxEvents.length>8) combatFxEvents.splice(0,combatFxEvents.length-8);
    play(event);
    return event;
  }

  function kill(source,target,style=null){
    const src=Number(source),dst=Number(target);
    if(!Number.isInteger(src)||!Number.isInteger(dst)||src===dst) return false;
    const resolved=knownStyle(style||(
      lastEvent && Number(lastEvent.source)===src && Number(lastEvent.target)===dst
        ? lastEvent.style
        : sourceStyle(src)
    ));
    // Let the attack impact land before the execution starts.
    setTimeout(()=>addKillFx(resolved,src,dst,false),210);
    return true;
  }

  function frame(now){
    resize();
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    activeLabFx=activeLabFx.filter(fx=>drawLabFx(fx,now));
    activeKillFx=activeKillFx.filter(fx=>drawKillFx(fx,now));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.WDAttackFx=Object.freeze({
    emit,play,kill,
    getLastPlayedId:()=>lastPlayedId,
    reset(){
      lastPlayedId="";
      lastEvent=null;
      activeLabFx=[];
      activeKillFx=[];
      ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    }
  });
})();
