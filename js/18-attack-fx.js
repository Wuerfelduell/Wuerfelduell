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
  // Dimensionsbiss: gemalter Kopf als WebP mit Alpha, Ober- und Unterkiefer werden getrennt gezeichnet.
  const dimensionbiteSprite=new Image();
  dimensionbiteSprite.decoding="async";
  dimensionbiteSprite.src=`assets/ui/v28/png/fx/attack-fx-dimensionsbiss-head.webp?v=${ASSET_REV}`;

  const FX_SPRITE_ROOT="assets/ui/v28/svg/";
  const FX_SPRITE_PATHS={
    spade:"fx/card-spade.svg",
    heart:"fx/card-heart.svg",
    diamond:"fx/card-diamond.svg",
    club:"fx/card-club.svg",
    crown:"gameplay/crown.svg"
  };
  const fxSprites=Object.fromEntries(Object.entries(FX_SPRITE_PATHS).map(([key,path])=>{
    const image=new Image();
    image.decoding="async";
    image.src=`${FX_SPRITE_ROOT}${path}?v=${ASSET_REV}`;
    return [key,image];
  }));

  function drawFxSprite(key,x,y,size,alpha=1,rotation=0,shadowColor="",shadowBlur=0){
    const image=fxSprites[key];
    if(!image?.complete||!image.naturalWidth) return false;
    ctx.save();
    ctx.translate(x,y);
    ctx.rotate(rotation);
    ctx.globalAlpha=Math.max(0,Math.min(1,alpha));
    if(shadowColor){ctx.shadowColor=shadowColor;ctx.shadowBlur=shadowBlur;}
    ctx.drawImage(image,-size/2,-size/2,size,size);
    ctx.restore();
    return true;
  }

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

  function labFxColor(style){
    return {
      classic:['#9ee8ff','#3aa8ff'],
      lightning:['#e9fdff','#57cfff'],
      flame:['#ff6b6b','#b60020'],
      venom:['#aaff88','#28c954'],
      blood:['#ff6a79','#8d001c'],
      jackpot:['#ffe58a','#e8a82e'],
      void:['#c990ff','#5d27b8'],
      confetti:['#ffffff','#ff78d7'],
      frost:['#e8ffff','#65cffa'],
      rift:['#d5a5ff','#42d9ff'],
      crown:['#fff1a8','#ffc43d'],
      soulbreak:['#8ed8ff','#a96cff'],
      solarsplash:['#fff4a8','#ff9d24'],
      trigonbomb:['#75ffe1','#2fd3a6'],
      confettibomb:['#ffd45a','#ff5fbc'],
      polygon:['#75ffe1','#9d72ff'],
      missile:['#ffd45a','#ff704f'],
      thunderstrike:['#75ffe1','#b06cff'],
      catattack:['#ffd45a','#75ffe1'],
      quantumleap:['#75ffe1','#b06cff'],
      cometshower:['#ffd45a','#ff704f'],
      timefracture:['#ffd45a','#75ffe1'],
      mirrorstorm:['#75ffe1','#fff4bf'],
      dimensionbite:['#75e8ff','#b06cff'],
      runestrike:['#ffd45a','#4a8ff0'],
      koenigsfall:['#e9c16d','#bd943e'],
      dornenrequiem:['#9160d3','#8ccedf']
    }[style]||['#ffffff','#77bfff'];
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
    const suits=['spade','heart','diamond','club'];

    drawFxSprite(suits[Math.floor(fx.seed)%4],pos.x,pos.y,30,.9,t*9,c2,10);

    if(t>.55){
      const e=(t-.55)/.45;
      for(let k=0;k<12;k++){
        const a=k*Math.PI*2/12 + (k%2)*.12;
        const d=e*(38+(k%4)*13);
        drawFxSprite(suits[k%4],fx.to.x+Math.cos(a)*d,fx.to.y+Math.sin(a)*d,24,(1-e)*.95,a,c1,6);
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
    drawFxSprite('crown',fx.to.x,y,46,.95,0,c2,16);
    if(t>.58){
      const q=(t-.58)/.42;
      ctx.strokeStyle=c1;ctx.lineWidth=3;ctx.globalAlpha=(1-q)*.8;
      ctx.beginPath();ctx.arc(fx.to.x,fx.to.y,8+q*58,0,Math.PI*2);ctx.stroke();
      ctx.globalAlpha=1;
    }
  }


  function soulbreakCubePoints(cx,cy,size,rx,ry,rz){
    const points=[];
    const crx=Math.cos(rx),srx=Math.sin(rx),cry=Math.cos(ry),sry=Math.sin(ry),crz=Math.cos(rz),srz=Math.sin(rz);
    for(let i=0;i<8;i++){
      let x=((i&1)?1:-1)*size,y=((i&2)?1:-1)*size,z=((i&4)?1:-1)*size;
      const y1=y*crx-z*srx,z1=y*srx+z*crx;y=y1;z=z1;
      const x1=x*cry+z*sry,z2=-x*sry+z*cry;x=x1;z=z2;
      const x2=x*crz-y*srz,y2=x*srz+y*crz;x=x2;y=y2;
      const perspective=1+z/Math.max(1,size*8);
      points.push({x:cx+x*perspective,y:cy+y*perspective});
    }
    return points;
  }

  function drawSoulbreakCube(x,y,size,rotation,alpha=1,collapse=1){
    const points=soulbreakCubePoints(x,y,size*collapse,.68+rotation*.3,rotation*.76,rotation*.48);
    const edges=[[0,1],[0,2],[0,4],[1,3],[1,5],[2,3],[2,6],[3,7],[4,5],[4,6],[5,7],[6,7]];
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';
    edges.forEach(([a,b])=>{
      ctx.strokeStyle='#8a5818';ctx.lineWidth=5;ctx.globalAlpha=alpha*.18;
      ctx.beginPath();ctx.moveTo(points[a].x,points[a].y);ctx.lineTo(points[b].x,points[b].y);ctx.stroke();
      ctx.strokeStyle='#ffd978';ctx.lineWidth=1.45;ctx.globalAlpha=alpha;
      ctx.beginPath();ctx.moveTo(points[a].x,points[a].y);ctx.lineTo(points[b].x,points[b].y);ctx.stroke();
    });
    points.forEach(p=>glowCircle(ctx,p.x,p.y,5,'#ffe8a8',alpha*.34));
    ctx.restore();
  }

  function drawSoulbreakSigil(x,y,r,alpha,rotation){
    if(alpha<=0) return;
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.strokeStyle='#e7b94e';ctx.lineWidth=1.35;ctx.globalAlpha=alpha;
    ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();
    ctx.beginPath();ctx.arc(0,0,r*.72,0,Math.PI*2);ctx.stroke();
    for(let i=0;i<8;i++){
      const a=i*Math.PI/4;
      ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.82,Math.sin(a)*r*.82);ctx.lineTo(Math.cos(a)*r*1.08,Math.sin(a)*r*1.08);ctx.stroke();
      ctx.save();ctx.translate(Math.cos(a)*r*1.18,Math.sin(a)*r*1.18);ctx.rotate(a);
      ctx.beginPath();ctx.moveTo(-2.5,0);ctx.lineTo(0,-4);ctx.lineTo(2.5,0);ctx.lineTo(0,4);ctx.closePath();ctx.stroke();ctx.restore();
    }
    ctx.restore();
  }

  function drawSoulbreakCore(x,y,r,time,alpha=1){
    ctx.save();ctx.globalCompositeOperation='lighter';
    glowCircle(ctx,x,y,r*2.25,'#4a8ff0',alpha*.46);
    glowCircle(ctx,x,y,r*1.42,'#a96cff',alpha*.6);
    for(let i=0;i<6;i++){
      const a=i*Math.PI/3+time*.007;
      const px=x+Math.cos(a)*r*.3,py=y+Math.sin(a)*r*.3;
      ctx.fillStyle=i%2?'#6caeff':'#b06cff';ctx.globalAlpha=alpha*.34;
      ctx.beginPath();ctx.moveTo(x,y+r*.1);
      ctx.quadraticCurveTo(px,py,px+Math.cos(a)*r*.42,py-r*(.74+(i%3)*.12));
      ctx.quadraticCurveTo(px-r*.1,py-r*.18,x,y+r*.1);ctx.fill();
    }
    glowCircle(ctx,x,y,r*.58,'#ffffff',alpha*.92);
    ctx.restore();
  }

  function soulbreakPoint(fx,p){
    const e=easeOutCubic(Math.max(0,Math.min(1,p)));
    return {
      x:lerp(fx.from.x,fx.to.x,e),
      y:lerp(fx.from.y,fx.to.y,e)-Math.sin(e*Math.PI)*Math.min(78,Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y)*.18)
    };
  }

  function drawSoulbreak(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y);
    const base=Math.max(18,Math.min(31,distance*.065));
    if(t<.2){
      const e=easeInOut(t/.2);
      drawSoulbreakSigil(fx.from.x,fx.from.y,base*(1.05+e*.55),e*.72,-t*8);
      drawSoulbreakCore(fx.from.x,fx.from.y,base*.72,fx.start+t*900,e);
      drawSoulbreakCube(fx.from.x,fx.from.y,base,e*3.5,e);
      return;
    }
    if(t<.76){
      const p=(t-.2)/.56;
      const pos=soulbreakPoint(fx,p);
      const dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y,len=Math.max(1,Math.hypot(dx,dy)),nx=-dy/len,ny=dx/len;
      for(let i=1;i<=18;i++){
        const q=p-i*.026;
        if(q<=0) continue;
        const trail=soulbreakPoint(fx,q),wave=Math.sin(i*.72+t*30)*base*.3*(i/18),fade=(1-i/19)*Math.min(1,p*8);
        glowCircle(ctx,trail.x+nx*wave,trail.y+ny*wave,Math.max(2,base*.26-i*.18),i%2?'#4a8ff0':'#a96cff',fade*.28);
      }
      const collapse=p>.86?1-easeInOut((p-.86)/.14)*.76:1;
      drawSoulbreakCore(pos.x,pos.y,base*.72,fx.start+t*900,1);
      drawSoulbreakCube(pos.x,pos.y,base,t*12+fx.seed,1,collapse);
    }
    if(t>.61){
      const e=Math.min(1,(t-.61)/.15);
      drawSoulbreakSigil(fx.to.x,fx.to.y,base*(.8+e*.65),e*.58,t*5);
    }
  }

  function drawSolarCore(x,y,r,time,alpha=1){
    ctx.save();ctx.globalCompositeOperation='lighter';
    glowCircle(ctx,x,y,r*3,'#ff9d24',alpha*.42);
    glowCircle(ctx,x,y,r*1.65,'#ffd84d',alpha*.72);
    glowCircle(ctx,x,y,r*.72,'#fff8c2',alpha*.96);
    ctx.translate(x,y);ctx.rotate(time*.0018);
    for(let i=0;i<12;i++){
      const a=i*Math.PI/6,len=r*(1.25+(i%3)*.14);
      ctx.strokeStyle=i%2?'#ffbd38':'#fff1a0';ctx.globalAlpha=alpha*(.5+(i%4)*.09);ctx.lineWidth=1.2+(i%3)*.45;
      ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.7,Math.sin(a)*r*.7);
      ctx.quadraticCurveTo(Math.cos(a+.14)*len*.9,Math.sin(a+.14)*len*.9,Math.cos(a)*len,Math.sin(a)*len);ctx.stroke();
    }
    ctx.restore();
  }

  function solarPoint(fx,p){
    const e=easeOutCubic(Math.max(0,Math.min(1,p)));
    return {x:lerp(fx.from.x,fx.to.x,e),y:lerp(fx.from.y,fx.to.y,e)-Math.sin(e*Math.PI)*Math.min(92,Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y)*.2)};
  }

  function drawSolarsplash(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(18,Math.min(30,distance*.062));
    if(t<.22){
      const e=easeInOut(t/.22),y=fx.from.y-base*.8;
      drawSolarCore(fx.from.x,y,base*(.42+e*.58),fx.start+t*1000,e);
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<14;i++){
        const a=i*Math.PI*2/14-t*8,d=(1-e)*(base*3.5+(i%4)*6)+base;
        glowCircle(ctx,fx.from.x+Math.cos(a)*d,y+Math.sin(a)*d,2.5+(i%3),'#ffd14d',e*.48);
      }
      ctx.restore();return;
    }
    if(t<.69){
      const p=(t-.18)/.51,pos=solarPoint(fx,p);
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=1;i<=24;i++){
        const q=p-i*.018;if(q<=0) continue;
        const trail=solarPoint(fx,q),fade=(1-i/25)*Math.min(1,p*8);
        glowCircle(ctx,trail.x,trail.y,Math.max(2,base*.32+i*.14),i%4===0?'#fff0a0':'#ff9d24',fade*.25);
      }
      ctx.restore();drawSolarCore(pos.x,pos.y,base*.78,fx.start+t*1000,1);
    }
  }

  function drawTriangleGlyph(x,y,r,rotation,alpha,color='#2fd3a6'){
    if(alpha<=0) return;
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalCompositeOperation='lighter';
    ctx.globalAlpha=alpha*.2;ctx.fillStyle=color;ctx.beginPath();ctx.moveTo(0,-r);ctx.lineTo(r*.866,r*.5);ctx.lineTo(-r*.866,r*.5);ctx.closePath();ctx.fill();
    ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.lineWidth=2;ctx.stroke();
    ctx.rotate(-rotation*1.7);ctx.globalAlpha=alpha*.78;ctx.strokeStyle='#ffd45a';ctx.lineWidth=1.15;
    ctx.beginPath();ctx.moveTo(0,-r*.56);ctx.lineTo(r*.485,r*.28);ctx.lineTo(-r*.485,r*.28);ctx.closePath();ctx.stroke();ctx.restore();
  }

  function trigonPoint(fx,p){
    const q=Math.max(0,Math.min(.9999,p)),step=Math.min(2,Math.floor(q*3)),e=easeInOut(q*3-step);
    const p1=step===0?fx.from:step===1?{x:lerp(fx.from.x,fx.to.x,.34),y:fx.from.y-Math.min(82,Math.abs(fx.to.x-fx.from.x)*.18)}:{x:lerp(fx.from.x,fx.to.x,.68),y:fx.from.y+Math.min(68,Math.abs(fx.to.x-fx.from.x)*.14)};
    const p2=step===0?{x:lerp(fx.from.x,fx.to.x,.34),y:fx.from.y-Math.min(82,Math.abs(fx.to.x-fx.from.x)*.18)}:step===1?{x:lerp(fx.from.x,fx.to.x,.68),y:fx.from.y+Math.min(68,Math.abs(fx.to.x-fx.from.x)*.14)}:fx.to;
    return pointOn(p1,p2,e);
  }

  function drawTrigonCore(x,y,r,time,alpha=1){
    ctx.save();ctx.globalCompositeOperation='lighter';glowCircle(ctx,x,y,r*2.2,'#2fd3a6',alpha*.28);
    drawTriangleGlyph(x,y,r,-Math.PI/2+time*.002,alpha,'#75ffe1');
    drawTriangleGlyph(x,y,r*.64,Math.PI/2-time*.0026,alpha*.84,'#ffd45a');
    glowCircle(ctx,x,y,r*.5,'#ffffff',alpha*.68);ctx.restore();
  }

  function drawTrigonbomb(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(17,Math.min(28,distance*.06));
    if(t<.24){
      const e=easeInOut(t/.24);
      for(let i=0;i<3;i++){
        const a=i*Math.PI*2/3+t*12,d=(1-e)*base*3.2+base*1.15;
        drawTriangleGlyph(fx.from.x+Math.cos(a)*d,fx.from.y+Math.sin(a)*d,base*.55+e*base*.14,a+t*7,e,'#2fd3a6');
      }
      if(e>.54) drawTrigonCore(fx.from.x,fx.from.y,base*(.45+(e-.54)*.72),fx.start+t*1000,(e-.54)/.46);
      return;
    }
    if(t<.69){
      const p=(t-.21)/.48,pos=trigonPoint(fx,p);
      for(let i=1;i<=18;i++){
        const q=p-i*.024;if(q<=0) continue;
        const trail=trigonPoint(fx,q),fade=(1-i/19)*Math.min(1,p*8);
        drawTriangleGlyph(trail.x,trail.y,2+fade*5,(i%2?1:-1)*t*12+i,fade*.46,i%3?'#2fd3a6':'#ffd45a');
      }
      drawTrigonCore(pos.x,pos.y,base*.82,fx.start+t*1000,1);
      const lock=Math.max(0,(p-.62)/.38);
      if(lock>0) drawTriangleGlyph(fx.to.x,fx.to.y,base*(1.15+lock*.5),-t*8,lock*.68,'#2fd3a6');
    }
  }

  function drawConfettiBombCore(x,y,r,time,alpha=1){
    if(alpha<=0) return;
    ctx.save();ctx.translate(x,y);ctx.rotate(time*.0032);ctx.globalCompositeOperation='lighter';
    glowCircle(ctx,0,0,r*2.5,'#ffd45a',alpha*.24);
    const g=ctx.createRadialGradient(-r*.28,-r*.3,1,0,0,r);
    g.addColorStop(0,'rgba(61,131,218,.95)');g.addColorStop(.5,'rgba(13,57,117,.98)');g.addColorStop(1,'rgba(2,13,34,.98)');
    ctx.globalAlpha=alpha;ctx.fillStyle=g;ctx.strokeStyle='#f6d679';ctx.lineWidth=Math.max(2,r*.12);ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#fff4bf';ctx.lineWidth=Math.max(1,r*.045);ctx.globalAlpha=alpha*.62;
    for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r*.86,Math.sin(a)*r*.86);ctx.stroke();}
    ctx.globalAlpha=alpha;ctx.fillStyle='#c98a26';ctx.strokeStyle='#fff4bf';ctx.lineWidth=1.6;ctx.beginPath();ctx.roundRect(-r*.2,-r*1.3,r*.4,r*.36,3);ctx.fill();ctx.stroke();
    ctx.strokeStyle='#ffd45a';ctx.lineWidth=2.4;ctx.beginPath();ctx.moveTo(0,-r*1.28);ctx.quadraticCurveTo(r*.55,-r*1.62,r*.76,-r*1.24);ctx.stroke();
    glowCircle(ctx,r*.79,-r*1.23,r*.32,'#ff665f',alpha*.86);ctx.restore();
  }

  function confettiBombPoint(fx,p){
    const q=easeInOut(Math.max(0,Math.min(1,p))),height=Math.min(104,Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y)*.24);
    return {x:lerp(fx.from.x,fx.to.x,q),y:lerp(fx.from.y,fx.to.y,q)-Math.sin(q*Math.PI)*height};
  }

  function drawConfettibomb(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(17,Math.min(28,distance*.06));
    if(t<.24){
      const e=easeInOut(t/.24);
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<3;i++){const a=i*Math.PI*2/3+t*10,d=(1-e)*base*3.4+base*1.1;glowCircle(ctx,fx.from.x+Math.cos(a)*d,fx.from.y+Math.sin(a)*d,3.2+i,'#'+['ff5fbc','4ad7ff','ffd45a'][i],e*.48);}
      ctx.restore();drawConfettiBombCore(fx.from.x,fx.from.y,base*(.48+e*.52),fx.start+t*1000,e);return;
    }
    if(t<.7){
      const p=(t-.2)/.5,pos=confettiBombPoint(fx,p);
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=1;i<=22;i++){const q=p-i*.021;if(q<=0)continue;const trail=confettiBombPoint(fx,q),fade=(1-i/23)*Math.min(1,p*8),color=i%3===0?'#4ad7ff':i%2?'#ff5fbc':'#ffd45a';glowCircle(ctx,trail.x,trail.y,Math.max(2,base*.22+i*.11),color,fade*.23);}
      ctx.restore();drawConfettiBombCore(pos.x,pos.y,base*.82,fx.start+t*1200,1);
    }
  }

  function drawPolygonGlyph(x,y,r,sides,rotation,alpha,filled=false){
    if(alpha<=0) return;
    ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;
    if(filled){const g=ctx.createRadialGradient(-r*.3,-r*.3,1,0,0,r);g.addColorStop(0,'rgba(255,255,255,.82)');g.addColorStop(.3,'rgba(117,255,225,.46)');g.addColorStop(1,'rgba(74,34,115,.2)');ctx.fillStyle=g;}
    ctx.strokeStyle='#75ffe1';ctx.lineWidth=2;ctx.beginPath();
    for(let i=0;i<sides;i++){const a=i*Math.PI*2/sides,px=Math.cos(a)*r,py=Math.sin(a)*r;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();if(filled)ctx.fill();ctx.stroke();
    ctx.strokeStyle='#9d72ff';ctx.lineWidth=1.15;for(let i=0;i<sides;i++){const a=i*Math.PI*2/sides;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}
    ctx.rotate(Math.PI/sides);ctx.globalAlpha=alpha*.68;ctx.strokeStyle='#ffd45a';ctx.beginPath();
    for(let i=0;i<sides-2;i++){const a=i*Math.PI*2/(sides-2),px=Math.cos(a)*r*.58,py=Math.sin(a)*r*.58;i?ctx.lineTo(px,py):ctx.moveTo(px,py);}ctx.closePath();ctx.stroke();ctx.restore();
  }

  function polygonPoint(fx,p){
    const q=easeInOut(Math.max(0,Math.min(1,p))),wave=Math.sin(q*Math.PI*3)*Math.min(24,Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y)*.05);
    const dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y,len=Math.max(1,Math.hypot(dx,dy));return{x:lerp(fx.from.x,fx.to.x,q)-dy/len*wave,y:lerp(fx.from.y,fx.to.y,q)+dx/len*wave};
  }

  function drawPolygon(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(18,Math.min(29,distance*.062));
    if(t<.25){const e=easeInOut(t/.25);for(let layer=0;layer<3;layer++)drawPolygonGlyph(fx.from.x,fx.from.y,(base*(.55+layer*.38))*e,6+layer,(layer%2?1:-1)*t*(7+layer),e*(.95-layer*.15),layer===0);return;}
    if(t<.69){const p=(t-.21)/.48,pos=polygonPoint(fx,p);for(let i=1;i<=15;i++){const q=p-i*.031;if(q<=0)continue;const trail=polygonPoint(fx,q),fade=(1-i/16)*Math.min(1,p*8);drawTriangleGlyph(trail.x,trail.y,3+fade*6,(i%2?1:-1)*(t*13+i),fade*.42,i%3?'#75ffe1':'#9d72ff');}drawPolygonGlyph(pos.x,pos.y,base*.88,8,t*11+fx.seed,1,true);}
  }

  function drawMissileGlyph(x,y,size,angle,alpha){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.globalCompositeOperation='lighter';
    glowCircle(ctx,-size*.8,0,size*.8,'#ff704f',alpha*.42);ctx.fillStyle='#0d3975';ctx.strokeStyle='#f6d679';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(size*.42,-size*.34);ctx.lineTo(-size*.66,-size*.28);ctx.lineTo(-size,0);ctx.lineTo(-size*.66,size*.28);ctx.lineTo(size*.42,size*.34);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#c98a26';ctx.beginPath();ctx.moveTo(-size*.55,-size*.22);ctx.lineTo(-size*.94,-size*.65);ctx.lineTo(-size*.28,-size*.3);ctx.closePath();ctx.fill();ctx.beginPath();ctx.moveTo(-size*.55,size*.22);ctx.lineTo(-size*.94,size*.65);ctx.lineTo(-size*.28,size*.3);ctx.closePath();ctx.fill();
    ctx.fillStyle='#fff4bf';ctx.beginPath();ctx.moveTo(-size,0);ctx.lineTo(-size*1.7,-size*.27);ctx.lineTo(-size*1.45,0);ctx.lineTo(-size*1.7,size*.27);ctx.closePath();ctx.fill();ctx.restore();
  }

  function missilePoint(fx,p,lane=0){
    const q=easeInOut(Math.max(0,Math.min(1,p))),dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y,len=Math.max(1,Math.hypot(dx,dy)),h=92+Math.abs(lane)*.8,a=1-q;
    return{x:lerp(fx.from.x,fx.to.x,q)-dy/len*lane,y:a*a*fx.from.y+2*a*q*(Math.min(fx.from.y,fx.to.y)-h)+q*q*fx.to.y+dx/len*lane};
  }

  function drawMissileAttack(fx,t){
    const d=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(13,Math.min(21,d*.047));
    if(t<.52){const a=Math.min(1,t/.2)*Math.min(1,(.52-t)/.14);ctx.save();ctx.translate(fx.to.x,fx.to.y);ctx.rotate(t*4);ctx.globalAlpha=a;ctx.strokeStyle='#ff704f';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,base*1.5,0,Math.PI*2);ctx.stroke();for(let i=0;i<4;i++){ctx.rotate(Math.PI/2);ctx.beginPath();ctx.moveTo(base*1.1,0);ctx.lineTo(base*2.05,0);ctx.stroke();}ctx.restore();}
    for(let i=0;i<3;i++){const p=(t-(.14+i*.085))/.5,lane=(i-1)*base*1.4;if(p<=0||p>=1)continue;const pos=missilePoint(fx,p,lane),prev=missilePoint(fx,Math.max(0,p-.025),lane),angle=Math.atan2(pos.y-prev.y,pos.x-prev.x);for(let k=1;k<9;k++){const q=p-k*.022;if(q<=0)continue;const tr=missilePoint(fx,q,lane);glowCircle(ctx,tr.x,tr.y,2+k*.45,k%2?'#c7d2df':'#ff704f',(1-k/9)*.22);}drawMissileGlyph(pos.x,pos.y,base,angle,1);}
  }

  function drawThunderBolt(x1,y1,x2,y2,seed,width,color,alpha,branches=true){
    const points=[];for(let i=0;i<=13;i++){const q=i/13,spread=Math.sin(q*Math.PI)*(22+width*2),noise=Math.sin(seed*1.73+i*12.9898)*43758.5453%1;points.push({x:lerp(x1,x2,q)+(noise-.5)*spread,y:lerp(y1,y2,q)});}
    ctx.save();ctx.globalCompositeOperation='lighter';ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor=color;ctx.shadowBlur=20;ctx.strokeStyle=color;ctx.globalAlpha=alpha;ctx.lineWidth=width;ctx.beginPath();points.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.stroke();ctx.strokeStyle='#ffffff';ctx.globalAlpha=alpha*.9;ctx.lineWidth=Math.max(1,width*.25);ctx.stroke();
    if(branches)for(let i=3;i<11;i+=3){const p=points[i],dir=i%2?1:-1,len=30+(i%4)*8;ctx.strokeStyle=i%2?'#8ed8ff':'#b06cff';ctx.globalAlpha=alpha*.58;ctx.lineWidth=Math.max(1,width*.28);ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(p.x+dir*15,p.y+14);ctx.lineTo(p.x+dir*len,p.y+38);ctx.stroke();}ctx.restore();
  }

  function drawThunderstrike(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(18,Math.min(29,distance*.06)),fade=t<.42?Math.min(1,t/.28):Math.max(0,1-(t-.42)/.16);
    if(fade>0){glowCircle(ctx,fx.to.x,fx.to.y-base*2.8,base*3.2,'#4a8ff0',fade*.24);ctx.save();ctx.translate(fx.to.x,fx.to.y);ctx.rotate(t*5);ctx.globalAlpha=fade*.8;ctx.strokeStyle='#75ffe1';ctx.lineWidth=2;for(let i=0;i<4;i++){ctx.beginPath();ctx.arc(0,0,base*(1.1+i*.42),i*.6,i*.6+Math.PI*1.5);ctx.stroke();}ctx.restore();}
    if(t>.31&&t<.7){const a=Math.min(1,(t-.31)/.055)*Math.max(0,1-(t-.58)/.12);drawThunderBolt(fx.to.x+18,-22,fx.to.x,fx.to.y,fx.seed,11,'#6fdcff',a,true);drawThunderBolt(fx.to.x-112,-12,fx.to.x-6,fx.to.y,fx.seed+17,3,'#b06cff',a*.62,true);drawThunderBolt(fx.to.x+104,-14,fx.to.x+7,fx.to.y,fx.seed+31,3,'#8ed8ff',a*.56,true);}
  }

  function drawPawGlyph(x,y,size,rotation,alpha,color='#ffd45a'){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=12;ctx.beginPath();ctx.ellipse(0,size*.22,size*.48,size*.4,0,0,Math.PI*2);ctx.fill();for(let i=-1.5;i<=1.5;i++){ctx.beginPath();ctx.ellipse(i*size*.27,-size*.3-Math.abs(i)*size*.05,size*.15,size*.2,0,0,Math.PI*2);ctx.fill();}ctx.restore();
  }

  function drawBattleCat(x,y,size,angle,alpha){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalAlpha=alpha;ctx.shadowColor='#b06cff';ctx.shadowBlur=18;const g=ctx.createLinearGradient(-size,-size,size,size);g.addColorStop(0,'#245da9');g.addColorStop(.55,'#101a42');g.addColorStop(1,'#4a2273');ctx.fillStyle=g;ctx.strokeStyle='#f6d679';ctx.lineWidth=2;
    ctx.beginPath();ctx.ellipse(0,0,size*.9,size*.5,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.arc(size*.75,-size*.18,size*.42,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(size*.48,-size*.48);ctx.lineTo(size*.58,-size*.92);ctx.lineTo(size*.86,-size*.56);ctx.lineTo(size*1.08,-size*.88);ctx.lineTo(size*1.14,-size*.38);ctx.closePath();ctx.fill();ctx.stroke();ctx.beginPath();ctx.moveTo(-size*.82,0);ctx.bezierCurveTo(-size*1.5,-size*.6,-size*1.6,size*.45,-size*1.05,size*.52);ctx.stroke();ctx.fillStyle='#75ffe1';for(const yy of [-.26,-.08]){ctx.beginPath();ctx.ellipse(size*.83,yy*size,size*.07,size*.11,0,0,Math.PI*2);ctx.fill();}ctx.restore();
  }

  function catAttackPoint(fx,p){
    const q=easeInOut(Math.max(0,Math.min(1,p))),mid={x:lerp(fx.from.x,fx.to.x,.52),y:Math.min(fx.from.y,fx.to.y)-90},u=1-q;return{x:u*u*fx.from.x+2*u*q*mid.x+q*q*fx.to.x,y:u*u*fx.from.y+2*u*q*mid.y+q*q*fx.to.y};
  }

  function drawCatattack(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(18,Math.min(27,distance*.058));
    if(t<.3){const e=easeInOut(Math.min(1,t/.2));glowCircle(ctx,fx.from.x,fx.from.y,base*(1.1+e*1.8),'#b06cff',e*.3);for(let i=0;i<4;i++)drawPawGlyph(fx.from.x+(i-1.5)*base*.7,fx.from.y+Math.sin(i*2)*base*.45,base*.28,t*5+i,e*.7,i%2?'#ffd45a':'#75ffe1');}
    const p=(t-.18)/.46;if(p>0&&p<1){const pos=catAttackPoint(fx,p),next=catAttackPoint(fx,Math.min(1,p+.015)),ang=Math.atan2(next.y-pos.y,next.x-pos.x);for(let i=1;i<7;i++){const q=p-i*.07;if(q<=0)continue;const pp=catAttackPoint(fx,q);drawPawGlyph(pp.x,pp.y+base*.65,base*.24,ang,(1-i/7)*.35,i%2?'#ffd45a':'#75ffe1');}drawBattleCat(pos.x,pos.y,base,ang,Math.min(1,p*10));}
  }

  function drawQuantumFragment(x,y,size,rotation,alpha,color){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalAlpha=alpha;ctx.fillStyle=color;ctx.shadowColor=color;ctx.shadowBlur=10;ctx.beginPath();ctx.moveTo(0,-size);ctx.lineTo(size*.72,0);ctx.lineTo(0,size);ctx.lineTo(-size*.72,0);ctx.closePath();ctx.fill();ctx.restore();
  }

  function drawQuantumRing(x,y,rx,ry,rotation,alpha,color){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=15;ctx.lineWidth=2.5;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();ctx.restore();
  }

  function drawQuantumleap(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(18,Math.min(28,distance*.06)),charge=Math.min(1,t/.25),depart=t<.38?charge:Math.max(0,1-(t-.38)/.12);
    if(depart>0){glowCircle(ctx,fx.from.x,fx.from.y,base*(1.2+charge*1.6),'#75ffe1',depart*.25);drawQuantumRing(fx.from.x,fx.from.y,base*(.8+charge),base*(.3+charge*.35),t*8,depart,'#75ffe1');drawQuantumRing(fx.from.x,fx.from.y,base*(.55+charge*.8),base*(1+charge*.7),-t*6,depart*.8,'#b06cff');for(let i=0;i<12;i++){const a=i*Math.PI*2/12+t*5,d=(1-charge)*base*2.8+base*1.2;drawQuantumFragment(fx.from.x+Math.cos(a)*d,fx.from.y+Math.sin(a)*d*.55,3+i%3,a+t*8,depart*(.55+i%2*.2),i%2?'#75ffe1':'#b06cff');}}
    const tunnel=Math.max(0,Math.min(1,(t-.23)/.26))*Math.max(0,1-(t-.49)/.13);if(tunnel>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=tunnel*.42;ctx.strokeStyle='#75ffe1';ctx.lineWidth=1.5;for(let lane=-2;lane<=2;lane++){ctx.beginPath();ctx.moveTo(fx.from.x,fx.from.y+lane*8);ctx.bezierCurveTo(lerp(fx.from.x,fx.to.x,.35),fx.from.y-70+lane*12,lerp(fx.from.x,fx.to.x,.65),fx.to.y+70-lane*12,fx.to.x,fx.to.y+lane*8);ctx.stroke();}ctx.restore();for(let i=0;i<16;i++){const p=(i/16+t*3)%1,x=lerp(fx.from.x,fx.to.x,p),y=lerp(fx.from.y,fx.to.y,p)+Math.sin(p*Math.PI*2+t*9)*22;drawQuantumFragment(x,y,2+i%3,t*12+i,tunnel*.55,i%2?'#fff4bf':'#75ffe1');}}
    const arrive=Math.max(0,Math.min(1,(t-.42)/.2)),fade=t<.82?arrive:Math.max(0,1-(t-.82)/.18);if(fade>0){glowCircle(ctx,fx.to.x,fx.to.y,base*(1+arrive*2.3),'#b06cff',fade*.34);drawQuantumRing(fx.to.x,fx.to.y,base*(.65+arrive*1.9),base*(.35+arrive*.75),-t*9,fade,'#b06cff');drawQuantumRing(fx.to.x,fx.to.y,base*(.35+arrive*1.45),base*(1+arrive*1.25),t*7,fade*.88,'#75ffe1');for(let i=0;i<18;i++){const a=i*2.399+t*4,d=(1-arrive)*base*3.1+arrive*base;drawQuantumFragment(fx.to.x+Math.cos(a)*d,fx.to.y+Math.sin(a)*d*.72,3+i%4,a-t*8,fade*.72,i%3?'#75ffe1':'#ffd45a');}}
  }

  function drawCometGlyph(x,y,size,angle,alpha,main=false){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;const tail=main?size*5:size*3.6,g=ctx.createLinearGradient(-tail,0,size,0);g.addColorStop(0,'rgba(74,143,240,0)');g.addColorStop(.55,'rgba(74,143,240,.28)');g.addColorStop(.82,'rgba(255,112,79,.72)');g.addColorStop(1,'#fff4bf');ctx.fillStyle=g;ctx.beginPath();ctx.moveTo(-tail,-size*.38);ctx.quadraticCurveTo(-size*.3,-size*.72,size,0);ctx.quadraticCurveTo(-size*.3,size*.72,-tail,size*.38);ctx.closePath();ctx.fill();glowCircle(ctx,0,0,size*1.9,main?'#fff4bf':'#ff704f',alpha*.72);ctx.fillStyle='#fff4bf';ctx.beginPath();ctx.arc(0,0,size*.62,0,Math.PI*2);ctx.fill();ctx.restore();
  }

  function cometShowerPoint(fx,p,lane){
    const start={x:fx.to.x-210+lane*34,y:-45-lane*18},end={x:fx.to.x+lane*12,y:fx.to.y+lane*5},q=easeInOut(Math.max(0,Math.min(1,p)));return{x:lerp(start.x,end.x,q)+Math.sin(q*Math.PI)*45,y:lerp(start.y,end.y,q)};
  }

  function drawCometshower(fx,t){
    const warn=Math.min(1,t/.22)*Math.max(0,1-(t-.35)/.15);if(warn>0){drawQuantumRing(fx.to.x,fx.to.y,32+warn*28,12+warn*9,t*4,warn*.6,'#ff704f');drawQuantumRing(fx.to.x,fx.to.y,20+warn*18,30+warn*20,-t*5,warn*.45,'#ffd45a');}
    for(let i=0;i<6;i++){const p=(t-(.12+i*.07))/.34;if(p<=0||p>=1)continue;const lane=i-2.5,pos=cometShowerPoint(fx,p,lane),next=cometShowerPoint(fx,Math.min(1,p+.01),lane);drawCometGlyph(pos.x,pos.y,7+i%2*2,Math.atan2(next.y-pos.y,next.x-pos.x),Math.min(1,p*10));}
    const p=(t-.52)/.28;if(p>0&&p<1){const pos=cometShowerPoint(fx,p,0),next=cometShowerPoint(fx,Math.min(1,p+.01),0);drawCometGlyph(pos.x,pos.y,18,Math.atan2(next.y-pos.y,next.x-pos.x),1,true);}
  }

  function drawTimeShard(x,y,size,angle,alpha){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(angle);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;ctx.shadowColor='#75ffe1';ctx.shadowBlur=16;const g=ctx.createLinearGradient(-size,0,size,0);g.addColorStop(0,'#0d3975');g.addColorStop(.5,'#75ffe1');g.addColorStop(1,'#fff4bf');ctx.fillStyle=g;ctx.strokeStyle='#ffd45a';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(size,0);ctx.lineTo(0,size*.56);ctx.lineTo(-size,0);ctx.lineTo(0,-size*.56);ctx.closePath();ctx.fill();ctx.stroke();ctx.restore();
  }

  function drawClockRing(x,y,r,rotation,alpha){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;ctx.strokeStyle='#ffd45a';ctx.shadowColor='#f6d679';ctx.shadowBlur=12;ctx.lineWidth=2.4;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();for(let i=0;i<12;i++){const a=i*Math.PI/6;ctx.beginPath();ctx.moveTo(Math.cos(a)*r*.82,Math.sin(a)*r*.82);ctx.lineTo(Math.cos(a)*r,Math.sin(a)*r);ctx.stroke();}ctx.strokeStyle='#75ffe1';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(0,0);ctx.lineTo(Math.cos(-rotation*1.8)*r*.64,Math.sin(-rotation*1.8)*r*.64);ctx.moveTo(0,0);ctx.lineTo(Math.cos(rotation*.7+1.5)*r*.42,Math.sin(rotation*.7+1.5)*r*.42);ctx.stroke();ctx.restore();
  }

  function timeFracturePoint(fx,p){const q=easeInOut(Math.max(0,Math.min(1,p))),mid={x:lerp(fx.from.x,fx.to.x,.5),y:Math.min(fx.from.y,fx.to.y)-66},u=1-q;return{x:u*u*fx.from.x+2*u*q*mid.x+q*q*fx.to.x,y:u*u*fx.from.y+2*u*q*mid.y+q*q*fx.to.y};}

  function drawTimefracture(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(17,Math.min(27,distance*.058)),charge=Math.min(1,t/.22);
    if(t<.34){const fade=Math.max(0,1-(t-.25)/.09);drawClockRing(fx.from.x,fx.from.y,base*(.65+charge*1.25),-t*8,fade);glowCircle(ctx,fx.from.x,fx.from.y,base*(1+charge),'#75ffe1',fade*.28);}
    const p=(t-.16)/.42;if(p>0&&p<1){const pos=timeFracturePoint(fx,p),next=timeFracturePoint(fx,Math.min(1,p+.01)),ang=Math.atan2(next.y-pos.y,next.x-pos.x);for(let i=1;i<=12;i++){const q=p-i*.035;if(q<=0)continue;const trail=timeFracturePoint(fx,q);drawTimeShard(trail.x,trail.y,5+i*.42,ang,(1-i/13)*.23);}drawTimeShard(pos.x,pos.y,base*.72,ang,1);for(const stop of [.23,.47,.7])if(p>stop){const ghost=timeFracturePoint(fx,stop);drawTimeShard(ghost.x,ghost.y,base*.52,ang,Math.max(0,1-(p-stop)/.5)*.35);}}
    const lock=Math.max(0,Math.min(1,(t-.42)/.22)),fade=t<.84?lock:Math.max(0,1-(t-.84)/.16);if(fade>0){drawClockRing(fx.to.x,fx.to.y,base*(.9+lock*1.8),-t*10,fade);drawClockRing(fx.to.x,fx.to.y,base*(.5+lock),t*7,fade*.68);}
  }

  function drawMirrorShard(x,y,w,h,rotation,alpha,cracked=false){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rotation);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;ctx.shadowColor='#75ffe1';ctx.shadowBlur=14;const g=ctx.createLinearGradient(-w/2,-h/2,w/2,h/2);g.addColorStop(0,'rgba(255,255,255,.92)');g.addColorStop(.28,'rgba(117,255,225,.36)');g.addColorStop(.66,'rgba(36,93,169,.52)');g.addColorStop(1,'rgba(176,108,255,.72)');ctx.fillStyle=g;ctx.strokeStyle='#fff4bf';ctx.lineWidth=1.8;ctx.beginPath();ctx.moveTo(0,-h/2);ctx.lineTo(w/2,-h*.12);ctx.lineTo(w*.3,h/2);ctx.lineTo(-w*.38,h*.38);ctx.lineTo(-w/2,-h*.2);ctx.closePath();ctx.fill();ctx.stroke();if(cracked){ctx.strokeStyle='#ffffff';ctx.lineWidth=1;ctx.globalAlpha=alpha*.65;ctx.beginPath();ctx.moveTo(0,-h*.42);ctx.lineTo(-w*.08,-h*.06);ctx.lineTo(w*.2,h*.18);ctx.moveTo(-w*.08,-h*.06);ctx.lineTo(-w*.3,h*.2);ctx.stroke();}ctx.restore();
  }

  function mirrorStormPoint(fx,p){const q=easeInOut(Math.max(0,Math.min(1,p))),mid={x:lerp(fx.from.x,fx.to.x,.54),y:Math.min(fx.from.y,fx.to.y)-82},u=1-q;return{x:u*u*fx.from.x+2*u*q*mid.x+q*q*fx.to.x,y:u*u*fx.from.y+2*u*q*mid.y+q*q*fx.to.y};}
  function drawMirrorBeam(a,b,color,alpha,width=2.2){if(alpha<=0)return;ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.strokeStyle='#ffffff';ctx.globalAlpha=alpha*.66;ctx.lineWidth=Math.max(1,width*.28);ctx.stroke();ctx.restore();}

  function drawMirrorstorm(fx,t){
    const distance=Math.hypot(fx.to.x-fx.from.x,fx.to.y-fx.from.y),base=Math.max(17,Math.min(27,distance*.058)),charge=Math.min(1,t/.22);
    if(t<.34){const fade=Math.max(0,1-(t-.25)/.09);for(let i=0;i<4;i++){const a=i*Math.PI/2+t*7,d=(1-charge)*base*2.5+base*.82;drawMirrorShard(fx.from.x+Math.cos(a)*d,fx.from.y+Math.sin(a)*d*.55,base*.3+charge*4,base*.6+charge*8,a,fade);}}
    const p=(t-.16)/.34;if(p>0&&p<1){const pos=mirrorStormPoint(fx,p),next=mirrorStormPoint(fx,Math.min(1,p+.01)),ang=Math.atan2(next.y-pos.y,next.x-pos.x);for(let i=1;i<10;i++){const q=p-i*.04;if(q<=0)continue;const trail=mirrorStormPoint(fx,q);drawMirrorShard(trail.x,trail.y,5,10,ang,(1-i/10)*.18);}drawMirrorShard(pos.x,pos.y,base*.72,base*1.35,ang,1,true);}
    const form=Math.max(0,Math.min(1,(t-.43)/.2)),mirrors=[];for(let i=0;i<6;i++){const a=-Math.PI/2+i*Math.PI/3,r=(1-form)*12+base*2.75,point={x:fx.to.x+Math.cos(a)*r,y:fx.to.y+Math.sin(a)*r*.66};mirrors.push(point);if(form>0)drawMirrorShard(point.x,point.y,base*(.6+form*.18),base*(1.18+form*.34),a+Math.PI/2,form,true);}
    if(t>.56&&t<.78){const bounce=Math.max(0,Math.min(1,(t-.56)/.18)),steps=Math.min(6,Math.floor(bounce*7));for(let i=0;i<steps;i++)drawMirrorBeam(mirrors[i],mirrors[(i*2+3)%6],i%2?'#75ffe1':'#ffd45a',.8,2.5);}
    const converge=Math.max(0,Math.min(1,(t-.69)/.17))*Math.max(0,1-(t-.86)/.08);if(converge>0)for(let i=0;i<6;i++)drawMirrorBeam(mirrors[i],fx.to,i%2?'#75ffe1':'#fff4bf',converge,3.2);
  }


  function drawDimensionJaw(x,y,size,gape,alpha,tilt=0){
    if(alpha<=0)return;
    if(!dimensionbiteSprite.complete||!dimensionbiteSprite.naturalWidth){
      glowCircle(ctx,x,y,size*1.35,'#b06cff',alpha*.38);return;
    }
    const iw=dimensionbiteSprite.naturalWidth,ih=dimensionbiteSprite.naturalHeight,split=.535,sy=Math.round(ih*split),w=size*3.05,h=w*ih/iw,close=1-Math.max(0,Math.min(1,gape)),hinge=-w*.15;
    ctx.save();ctx.translate(x,y);ctx.rotate(tilt);ctx.globalAlpha=alpha;ctx.shadowColor='#5939c9';ctx.shadowBlur=8;
    ctx.save();ctx.beginPath();ctx.rect(-w*.62,-h*.7,w*1.28,h*.72);ctx.clip();ctx.translate(hinge,0);ctx.rotate(close*.31);ctx.translate(-hinge,0);ctx.drawImage(dimensionbiteSprite,0,0,iw,sy,-w*.58,-h*split,w,h*split);ctx.restore();
    ctx.save();ctx.beginPath();ctx.rect(-w*.62,-2,w*1.28,h*.75);ctx.clip();ctx.translate(hinge,0);ctx.rotate(-close*.34);ctx.translate(-hinge,0);ctx.drawImage(dimensionbiteSprite,0,sy,iw,ih-sy,-w*.58,0,w,h*(1-split));ctx.restore();ctx.restore();
  }

  function dimensionBitePoint(fx,p){
    const q=Math.max(0,Math.min(1,p));
    return{x:lerp(fx.from.x+20,fx.to.x+24,q),y:lerp(fx.from.y,fx.to.y,q)-Math.sin(q*Math.PI)*78+Math.sin(q*Math.PI*2)*12};
  }

  function drawDimensionbite(fx,t){
    const open=Math.max(0,Math.min(1,(t-.06)/.16)),riftFade=t<.72?open:Math.max(0,1-(t-.72)/.14),rx=fx.from.x+42,ry=fx.from.y;
    if(riftFade>0){ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=riftFade;ctx.strokeStyle='#75e8ff';ctx.shadowColor='#b06cff';ctx.shadowBlur=18;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(rx,ry,22+open*30,12+open*18,-t*3.4,0,Math.PI*2);ctx.stroke();ctx.restore();}
    const flight=Math.max(0,Math.min(1,(t-.18)/.56));
    if(t>.17&&t<.82){
      for(let i=14;i>=1;i--){const q=Math.max(0,flight-i*.026),p=dimensionBitePoint(fx,q);drawQuantumFragment(p.x,p.y,3+i*.16,-flight*8+i,(1-i/15)*.22,i%2?'#75e8ff':'#b06cff');}
      for(const lag of [.14,.075]){const q=Math.max(0,flight-lag);if(q>0&&t<.735){const p=dimensionBitePoint(fx,q),n=dimensionBitePoint(fx,Math.min(1,q+.012));drawDimensionJaw(p.x,p.y,36+q*27,.82,(.07+q*.06)*(1-Math.max(0,(t-.68)/.055)),Math.atan2(n.y-p.y,n.x-p.x)*.5);}}
      const p=dimensionBitePoint(fx,flight),n=dimensionBitePoint(fx,Math.min(1,flight+.012)),rush=Math.max(0,(flight-.7)/.3),bite=Math.max(0,Math.min(1,(t-.665)/.075)),vanish=1-Math.max(0,Math.min(1,(t-.745)/.065)),bob=Math.sin(flight*Math.PI*6)*5*(1-rush),size=44+flight*24+rush*4,gape=bite>0?lerp(1,.02,easeInOut(bite)):.76+.2*(.5+.5*Math.sin(flight*Math.PI*5));
      drawDimensionJaw(p.x+easeOutCubic(bite)*12,p.y+bob,size,gape,vanish,Math.atan2(n.y-p.y,n.x-p.x)*.55);
    }
  }

  function drawRuneOrbit(x,y,rx,ry,rot,alpha,color){
    if(alpha<=0)return;ctx.save();ctx.translate(x,y);ctx.rotate(rot);ctx.globalCompositeOperation='lighter';ctx.globalAlpha=alpha;ctx.strokeStyle=color;ctx.shadowColor=color;ctx.shadowBlur=14;ctx.lineWidth=3;ctx.beginPath();ctx.ellipse(0,0,rx,ry,0,0,Math.PI*2);ctx.stroke();for(let i=0;i<10;i++){const a=i*Math.PI/5;ctx.save();ctx.translate(Math.cos(a)*rx,Math.sin(a)*ry);ctx.rotate(a);ctx.strokeRect(-4,-4,8,8);ctx.restore();}ctx.restore();
  }

  function drawRunestrike(fx,t){
    const l1=Math.min(1,t/.18),l2=Math.max(0,Math.min(1,(t-.12)/.2)),l3=Math.max(0,Math.min(1,(t-.24)/.2)),fade=t<.88?1:Math.max(0,1-(t-.88)/.12);
    drawRuneOrbit(fx.to.x,fx.to.y,40+l1*24,16+l1*8,t*4,l1*fade,'#ffd45a');drawRuneOrbit(fx.to.x,fx.to.y,52+l2*28,20+l2*10,-t*5+.75,l2*fade,'#fff4bf');drawRuneOrbit(fx.to.x,fx.to.y,64+l3*28,24+l3*12,t*6-1,l3*fade,'#f6d679');
    if(t>.53&&t<.8){const beam=Math.min(1,(t-.53)/.045)*Math.max(0,1-(t-.71)/.09);ctx.save();ctx.globalAlpha=beam;ctx.strokeStyle='#4a8ff0';ctx.shadowColor='#75e8ff';ctx.shadowBlur=30;ctx.lineWidth=22;ctx.beginPath();ctx.moveTo(fx.to.x,-20);ctx.lineTo(fx.to.x,fx.to.y);ctx.stroke();ctx.strokeStyle='#fff';ctx.lineWidth=7;ctx.stroke();ctx.restore();}
  }


  /* Koenigsfall und Dornenrequiem (Sprite-Lieferung 17.09.): gemalte WebP-Sprites
     statt gezeichneter Formen. Die Vorschau der Lieferung laeuft auf einer Zeitachse
     0..7.6 in 2000 ms; hier wird das normierte t darauf abgebildet. Groessen
     skalieren mit dem Abstand der Karten (Vorschau 788 px), Flugrichtung frei. */
  const FX_BITMAP_PATHS={
    kfHammer:"koenigsfall/hammer",kfCrown:"koenigsfall/crown",kfSeal:"koenigsfall/seal",kfDust:"koenigsfall/dust",
    drBud:"dornenrequiem/bud",drPetal:"dornenrequiem/petal",drOuter:"dornenrequiem/outer",drHeart:"dornenrequiem/heart"
  };
  const fxBitmaps=Object.fromEntries(Object.entries(FX_BITMAP_PATHS).map(([key,pfad])=>{
    const image=new Image();image.decoding="async";image.src=`assets/ui/v28/png/fx/${pfad}.webp?v=${ASSET_REV}`;return [key,image];
  }));
  const KF_HAMMER_CONTACT=.368; // Kontaktkante des Hammerkopfs, Anteil der Breite (aus dem Sprite gemessen)
  const bmClamp=(x,a=0,b=1)=>Math.max(a,Math.min(b,x)),bmSmooth=x=>{x=bmClamp(x);return x*x*(3-2*x);};
  function drawBitmap(key,x,y,w,angle=0,alpha=1,flip=false){
    const im=fxBitmaps[key];if(alpha<=0||!im?.complete||!im.naturalWidth) return false;
    const h=w*im.naturalHeight/im.naturalWidth;
    ctx.save();ctx.globalAlpha=bmClamp(alpha);ctx.translate(x,y);ctx.rotate(angle);if(flip)ctx.scale(-1,1);
    ctx.drawImage(im,-w/2,-h/2,w,h);ctx.restore();return true;
  }
  function bitmapSparks(x,y,t,color,count,k){
    if(t<0||t>1.5) return;ctx.save();ctx.fillStyle=color;
    for(let i=0;i<count;i++){const a=i*2.3999,s=(35+(i*37%120))*k,life=bmClamp(1-t/(.6+(i%7)*.13));ctx.globalAlpha=life*.8;
      const sz=1.4+(i%3);ctx.fillRect(x+Math.cos(a)*s*t,y+Math.sin(a)*s*t+55*k*t*t,sz,sz);}
    ctx.restore();
  }
  function bitmapFrame(fx){
    const dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y,dist=Math.hypot(dx,dy)||1;
    return {k:Math.max(.45,Math.min(1,dist/788)),dir:{x:dx/dist,y:dy/dist},flip:dx<0,dist};
  }
  function koenigsfallPose(fx,f,t){
    const w=155*f.k,startY=fx.from.y-90*f.k;
    if(t<1.2){const p=bmSmooth(t/1.2);return {x:fx.from.x,y:fx.from.y-90*f.k*p,a:-.6+.35*p,alpha:bmSmooth(t/.42),w};}
    const u=bmClamp((t-1.2)/2.65),endX=fx.to.x-f.dir.x*KF_HAMMER_CONTACT*w*1.15,endY=fx.to.y-f.dir.y*KF_HAMMER_CONTACT*w*1.15;
    return {x:fx.from.x+(endX-fx.from.x)*u,y:startY+(endY-startY)*u-90*f.k*Math.sin(Math.PI*u),a:-.25+(Math.PI*2+.25)*u,alpha:1-bmSmooth((t-3.85)/.55),w};
  }
  function drawKoenigsfall(fx,t01){
    const t=t01*7.6,f=bitmapFrame(fx),pose=koenigsfallPose(fx,f,t),{x,y,a,alpha,w}=pose,k=f.k,to=fx.to;
    if(t<1.2){const p=bmSmooth(t/1.2);glowCircle(ctx,x,y,135*k,'#d5ab57',.26*p);
      for(let i=0;i<3;i++){const orbit=(1-p)*145*k,ang=i*Math.PI*2/3+t*2.3;drawBitmap('kfCrown',x+Math.cos(ang)*orbit,y+Math.sin(ang)*orbit,47*k,ang+.5,alpha*(1-p));}}
    else if(t<3.85){for(let j=5;j>=1;j--){const q=koenigsfallPose(fx,f,Math.max(1.2,t-j*.035));drawBitmap('kfHammer',q.x,q.y,w,q.a,.026*(6-j),f.flip);}
      glowCircle(ctx,x,y,105*k,'#bd943e',.19);const orbitAlpha=bmSmooth((t-1.2)/.2)*(1-bmSmooth((t-3.45)/.4));
      for(let i=0;i<2;i++) drawBitmap('kfCrown',x+Math.cos(t*4+i*Math.PI)*80*k,y+Math.sin(t*4+i*Math.PI)*38*k,35*k,t*2+i,.8*orbitAlpha);}
    drawBitmap('kfHammer',x,y,w,a,alpha,f.flip);
    const h=t-3.85;
    if(h>=0){const fade=1-bmSmooth((h-1.1)/1.45);glowCircle(ctx,to.x,to.y,150*k,'#e9c16d',.65*Math.exp(-h*4));
      drawBitmap('kfSeal',to.x,to.y,160*k,0,bmSmooth(h/.16)*fade);
      for(let i=0;i<3;i++) drawBitmap('kfDust',to.x+(i-1)*25*k,to.y-35*k*bmClamp(h),(115+i*20)*k,(i-1)*.6,bmClamp(1-h/1.05)*.6);
      bitmapSparks(to.x,to.y,h,'#f8dc9a',32,k);
      for(let i=0;i<5;i++) drawBitmap('kfCrown',to.x+Math.sin(i*8)*h*70*k,to.y+Math.cos(i*8)*h*50*k+30*k*h*h,(20+i*3)*k,i+h*2,bmClamp(1-h/1.1));}
  }
  function dornenFan(x,y,open,spin,alpha,t,k){
    for(let i=0;i<6;i++){const a=i*Math.PI/3+spin,r=(18+open*38)*k,rock=Math.sin(t*4+i*.85)*(.055+open*.08);
      ctx.save();ctx.translate(x+Math.sin(a)*r,y-Math.cos(a)*r);ctx.rotate(a+rock);drawBitmap(i%2?'drOuter':'drPetal',0,-(20+open*12)*k,(47+open*22)*k,0,alpha);ctx.restore();}
    drawBitmap('drHeart',x,y,(57+open*20)*k,spin*.15,alpha);
  }
  function drawDornenrequiem(fx,t01){
    const t=t01*7.6,f=bitmapFrame(fx),k=f.k,from=fx.from,to=fx.to;
    let x=from.x,y=from.y,op=bmSmooth(t/.55),opening=0,spin=t*.4;
    if(t<1.35){const p=bmSmooth(t/1.35);y=from.y+(45-65*p)*k;opening=.15+.12*Math.sin(t*5);glowCircle(ctx,x,y,120*k,'#9160d3',.3*p);
      for(let i=0;i<3;i++){const a=i*2.094-t,r=(1-p)*115*k;drawBitmap('drOuter',x+Math.sin(a)*r,y-Math.cos(a)*r,50*k,a,op*(1-p));}}
    else if(t<3.65){const u=(t-1.35)/2.3,sy=from.y-20*k,ey=to.y-40*k;x=from.x+(to.x-from.x)*u;y=sy+(ey-sy)*u-64*k*Math.sin(Math.PI*2*u);
      opening=.1+.5*bmSmooth(u);spin=.54+u*2.4;
      for(let j=0;j<9;j++){const q=bmClamp(u-j*.016);glowCircle(ctx,from.x+(to.x-from.x)*q,sy+(ey-sy)*q-64*k*Math.sin(Math.PI*2*q),25*k,'#624da8',.035*(9-j));}
      for(let i=0;i<3;i++){const a=t*3+i*2.094,back=(42+i*16)*k;drawBitmap('drPetal',x-f.dir.x*back,y-f.dir.y*back+Math.sin(a)*29*k,24*k,a,.48);}
      glowCircle(ctx,x,y,100*k,'#7464db',.23);}
    else{const p=t-3.65;x=to.x;y=to.y-40*k+60*k*bmSmooth(p/.45);spin=2.94+p*.2;
      opening=p<.36?.6+.4*bmSmooth(p/.36):p<.6?1-.97*bmSmooth((p-.36)/.24):p<.92?.03+.92*bmSmooth((p-.6)/.32):.95;op=1-bmSmooth((p-1.55)/1);}
    dornenFan(x,y,opening,spin,op,t,k);
    drawBitmap('drBud',x,y,67*k,Math.sin(t*2)*.06,op*(1-bmSmooth(opening/.75)));
    const h=t-4.12;
    if(h>=0){glowCircle(ctx,to.x,to.y+4*k,155*k,'#8ccedf',.52*Math.exp(-h*3));bitmapSparks(to.x,to.y,h,'#b5e1e6',21,k);
      for(let i=0;i<6;i++){const a=i*Math.PI/3+.4,r=(48+bmSmooth(h/.5)*42)*k;drawBitmap('drOuter',to.x+Math.sin(a)*r,to.y+4*k-Math.cos(a)*r,42*k,a,bmClamp(h/.15)*(1-bmSmooth((h-.6)/1.1)));}}
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

      case 'soulbreak':
        e=Math.max(0,(t-.7)/.3);
        impactFlash(x,y,c1,e,82,.52);
        impactRing(x,y,c2,e,92,3.2,.82);
        impactRing(x,y,'#ffd978',Math.min(1,e*1.16),66,1.8,.68);
        impactSparks(x,y,c1,e,18,92);
        drawSoulbreakSigil(x,y,30+e*64,(1-e)*.78,-t*7);
        break;
      case 'solarsplash':
        e=Math.max(0,(t-.62)/.38);
        impactFlash(x,y,c1,e,104,.62);
        ctx.save();ctx.globalCompositeOperation='lighter';ctx.globalAlpha=(1-e)*.9;ctx.strokeStyle=c1;ctx.lineWidth=3.4;
        ctx.beginPath();ctx.ellipse(x,y,12+e*112,7+e*44,0,0,Math.PI*2);ctx.stroke();
        ctx.globalAlpha=(1-e)*.62;ctx.strokeStyle=c2;ctx.lineWidth=2;
        ctx.beginPath();ctx.ellipse(x,y,8+e*148,5+e*58,0,0,Math.PI*2);ctx.stroke();ctx.restore();
        impactSparks(x,y,c2,e,16,106);
        break;
      case 'trigonbomb':
        e=Math.max(0,(t-.61)/.39);
        impactFlash(x,y,c1,e,88,.48);
        for(let layer=0;layer<4;layer++){
          const q=Math.max(0,Math.min(1,e-layer*.06));
          if(q>0) drawTriangleGlyph(x,y,18+q*(62+layer*15),(layer%2?1:-1)*(t*7+q),Math.max(0,1-q)*(.9-layer*.12),layer%2?'#ffd45a':'#2fd3a6');
        }
        impactShards(x,y,c1,e,18,98);
        break;
      case 'confettibomb':
        e=Math.max(0,(t-.61)/.39);
        impactFlash(x,y,'#fff4bf',e,112,.68);
        impactRing(x,y,c1,e,118,3.5,.86);
        impactRing(x,y,c2,Math.min(1,e*1.16),86,2.2,.62);
        for(let k=0;k<34&&e>0&&e<1;k++){
          const a=k*2.399+fx.seed,d=e*(34+(k%7)*12),px=x+Math.cos(a)*d,py=y+Math.sin(a)*d+e*e*(k%4)*7;
          ctx.save();ctx.translate(px,py);ctx.rotate(a+e*(5+k%4));ctx.globalAlpha=(1-e)*.9;ctx.fillStyle=['#ffd45a','#ff5fbc','#4ad7ff','#68ed96','#b06cff'][k%5];
          if(k%9===0){ctx.beginPath();for(let i=0;i<10;i++){const q=i*Math.PI/5,r=i%2?3.2:7;const sx=Math.cos(q)*r,sy=Math.sin(q)*r;i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy);}ctx.closePath();ctx.fill();}
          else ctx.fillRect(-5,-2,10,4);ctx.restore();
        }
        break;
      case 'polygon':
        e=Math.max(0,(t-.58)/.42);
        impactFlash(x,y,'#ffffff',e,104,.56);
        for(let layer=0;layer<4;layer++){
          const q=Math.max(0,Math.min(1,e-layer*.055));
          if(q>0) drawPolygonGlyph(x,y,24+q*(58+layer*16),6+layer,(layer%2?1:-1)*(t*7+q),Math.max(0,1-q)*(.92-layer*.12),false);
        }
        impactRing(x,y,c1,e,112,3,.72);
        impactShards(x,y,c2,e,24,118);
        break;
      case 'missile':
        e=Math.max(0,(t-.55)/.45);for(let i=0;i<3;i++){const q=Math.max(0,Math.min(1,(t-(.55+i*.075))/.28));if(q>0){impactFlash(x+(i-1)*12,y+(i%2?7:-5),i%2?c1:c2,q,66,.48);impactRing(x,y,i%2?c1:c2,q,56+i*18,2.4,.64);}}
        impactSparks(x,y,c2,e,18,102);break;
      case 'thunderstrike':
        e=Math.max(0,(t-.34)/.66);impactFlash(x,y,'#ffffff',e,142,.78);impactRing(x,y,c1,e,148,4.2,.92);impactRing(x,y,c2,Math.min(1,e*1.16),108,2.6,.74);impactSparks(x,y,c1,e,24,136);break;
      case 'catattack':
        for(let slash=0;slash<3;slash++){const q=Math.max(0,Math.min(1,(t-(.57+slash*.075))/.25));if(q>0&&q<1){ctx.save();ctx.translate(x+(slash-1)*8,y);ctx.rotate(-.72+slash*.18);ctx.globalAlpha=(1-q)*.94;ctx.strokeStyle=slash===1?'#fff4bf':c2;ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=18;ctx.lineWidth=5;for(let claw=-1;claw<=1;claw++){ctx.beginPath();ctx.moveTo(-58,claw*13);ctx.quadraticCurveTo(0,-18+claw*11,lerp(-58,72,q),claw*10);ctx.stroke();}ctx.restore();}}
        e=Math.max(0,(t-.7)/.3);impactFlash(x,y,c2,e,106,.5);impactRing(x,y,c1,e,122,3.2,.82);for(let i=0;i<8;i++){const a=i*Math.PI/4,d=e*(42+(i%3)*17);drawPawGlyph(x+Math.cos(a)*d,y+Math.sin(a)*d*.7,5+i%2,a,(1-e)*.62,i%2?c2:c1);}break;
      case 'quantumleap':
        e=Math.max(0,(t-.56)/.44);impactFlash(x,y,'#ffffff',e,122,.66);impactRing(x,y,c1,e,142,3.6,.88);impactRing(x,y,c2,Math.min(1,e*1.15),104,2.4,.7);impactShards(x,y,c1,e,22,126);break;
      case 'cometshower':
        for(let i=0;i<6;i++){const q=Math.max(0,Math.min(1,(t-(.39+i*.07))/.27));if(q>0)impactFlash(x+(i-2.5)*12,y+(i%2?9:-9),i%2?c1:c2,q,50,.42);}
        e=Math.max(0,(t-.74)/.26);impactFlash(x,y,'#fff4bf',e,150,.84);impactRing(x,y,c2,e,152,4,.92);impactRing(x,y,c1,Math.min(1,e*1.16),112,2.6,.76);impactSparks(x,y,c1,e,26,148);break;
      case 'timefracture':
        for(let i=0;i<3;i++){const q=Math.max(0,Math.min(1,(t-(.62+i*.045))/.25));if(q>0){const a=i*Math.PI*2/3-t*2;impactFlash(x+Math.cos(a)*28,y+Math.sin(a)*18,i===1?c1:c2,q,62,.56);impactRing(x,y,i===1?c1:c2,q,70+i*17,2.4,.64);}}
        e=Math.max(0,(t-.74)/.26);impactFlash(x,y,'#ffffff',e,126,.72);impactRing(x,y,c1,e,142,3.5,.88);impactRing(x,y,c2,Math.min(1,e*1.16),104,2.5,.7);break;
      case 'mirrorstorm':
        e=Math.max(0,(t-.8)/.2);impactFlash(x,y,'#ffffff',e,138,.82);impactRing(x,y,c1,e,148,3.8,.9);for(let i=0;i<30;i++){const a=i*2.399,d=e*(38+(i%7)*15);drawMirrorShard(x+Math.cos(a)*d,y+Math.sin(a)*d*.65,4+i%3,9+i%5,a+e*8,(1-e)*.82,i%3===0);}break;
      case 'dimensionbite':
        e=Math.max(0,(t-.7)/.3);impactFlash(x,y,'#ffffff',e,166,.96);impactRing(x,y,c1,e,158,5.5,.98);impactRing(x,y,c2,Math.min(1,e*1.14),122,3.6,.86);impactShards(x,y,c1,e,28,142);break;
      case 'runestrike':
        e=Math.max(0,(t-.56)/.44);impactFlash(x,y,'#ffffff',e,158,.9);impactRing(x,y,c2,e,154,4.5,.94);impactRing(x,y,c1,Math.min(1,e*1.16),118,3,.78);impactShards(x,y,c1,e,22,126);break;
      case 'koenigsfall':
        e=Math.max(0,(t-.507)/.22);impactFlash(x,y,'#fff4bf',e,150,.7);impactRing(x,y,c1,e,150,4,.9);impactRing(x,y,c2,Math.min(1,e*1.15),110,2.6,.7);break;
      case 'dornenrequiem':
        e=Math.max(0,(t-.542)/.22);impactFlash(x,y,c2,e,120,.5);impactRing(x,y,c1,e,132,3.2,.86);impactShards(x,y,c2,e,16,110);break;
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
      case 'soulbreak':drawSoulbreak(fx,t);break;
      case 'solarsplash':drawSolarsplash(fx,t);break;
      case 'trigonbomb':drawTrigonbomb(fx,t);break;
      case 'confettibomb':drawConfettibomb(fx,t);break;
      case 'polygon':drawPolygon(fx,t);break;
      case 'missile':drawMissileAttack(fx,t);break;
      case 'thunderstrike':drawThunderstrike(fx,t);break;
      case 'catattack':drawCatattack(fx,t);break;
      case 'quantumleap':drawQuantumleap(fx,t);break;
      case 'cometshower':drawCometshower(fx,t);break;
      case 'timefracture':drawTimefracture(fx,t);break;
      case 'mirrorstorm':drawMirrorstorm(fx,t);break;
      case 'dimensionbite':drawDimensionbite(fx,t);break;
      case 'runestrike':drawRunestrike(fx,t);break;
      case 'koenigsfall':drawKoenigsfall(fx,t);break;
      case 'dornenrequiem':drawDornenrequiem(fx,t);break;
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
      case 'soulbreak':
        tone(210,0,.26,'sine',.032,74);tone(640,.08,.22,'triangle',.022,180);tone(1280,.22,.16,'sine',.018,520);noiseBurst(.24,.12,.016,1400);break;
      case 'solarsplash':
        tone(330,0,.28,'sine',.028,880);tone(660,.07,.24,'triangle',.024,1320);tone(1180,.18,.2,'sine',.018,620);noiseBurst(.2,.16,.018,900);break;
      case 'trigonbomb':
        tone(420,0,.1,'triangle',.022);tone(630,.09,.1,'triangle',.024);tone(945,.18,.14,'triangle',.027,310);noiseBurst(.24,.12,.022,1450);break;
      case 'confettibomb':
        tone(240,0,.18,'triangle',.025,480);tone(720,.12,.11,'square',.018);tone(980,.2,.15,'sine',.022,1420);noiseBurst(.19,.18,.026,1050);break;
      case 'polygon':
        tone(290,0,.14,'sine',.024,580);tone(580,.1,.16,'triangle',.022,1160);tone(1160,.2,.2,'sine',.02,360);noiseBurst(.22,.12,.018,1650);break;
      case 'missile':
        tone(190,0,.26,'sawtooth',.024,680);tone(240,.1,.24,'sawtooth',.022,840);tone(300,.2,.22,'sawtooth',.02,960);noiseBurst(.42,.24,.04,180);break;
      case 'thunderstrike':
        tone(68,0,.5,'sawtooth',.04,34);noiseBurst(.16,.3,.065,240);tone(1420,.13,.12,'square',.016,360);break;
      case 'catattack':
        tone(720,0,.12,'triangle',.022,980);tone(460,.13,.1,'sawtooth',.02,220);noiseBurst(.28,.13,.026,980);tone(860,.34,.16,'triangle',.018,420);break;
      case 'quantumleap':
        tone(240,0,.34,'sine',.026,960);tone(940,.16,.22,'triangle',.02,1820);tone(1480,.36,.18,'sine',.018,420);noiseBurst(.4,.1,.012,1700);break;
      case 'cometshower':
        tone(220,0,.3,'sawtooth',.022,620);noiseBurst(.18,.12,.025,480);noiseBurst(.34,.12,.028,420);noiseBurst(.5,.2,.05,180);tone(92,.48,.3,'sine',.035,44);break;
      case 'timefracture':
        tone(760,0,.18,'triangle',.02,340);tone(980,.14,.16,'sine',.018,520);tone(1240,.28,.14,'triangle',.018,680);noiseBurst(.39,.1,.014,1500);break;
      case 'mirrorstorm':
        tone(1100,0,.12,'sine',.018,1480);tone(1480,.11,.13,'triangle',.018,820);tone(1860,.23,.12,'sine',.016,980);noiseBurst(.36,.16,.03,1700);break;
      case 'dimensionbite':
        tone(118,0,.46,'sawtooth',.035,48);tone(420,.2,.22,'triangle',.022,110);noiseBurst(.48,.2,.042,360);break;
      case 'runestrike':
        tone(392,0,.18,'triangle',.022,784);tone(784,.18,.2,'sine',.024,1568);noiseBurst(.42,.18,.04,720);break;
      case 'koenigsfall':
        tone(72,0,.55,'sawtooth',.04,36);noiseBurst(.1,.28,.06,220);tone(392,.3,.16,'triangle',.024);tone(587,.38,.2,'triangle',.028);tone(784,.46,.26,'sine',.022);break;
      case 'dornenrequiem':
        tone(220,0,.4,'sine',.03,110);tone(330,.12,.36,'triangle',.02,165);noiseBurst(.34,.16,.03,900);tone(1320,.42,.22,'sine',.016,660);break;
      default:
        tone(260,0,.15,'triangle',.025,110);noiseBurst(.05,.08,.016,900);break;
    }
  }

  function addKillFx(style,source,target,preview=false,geometrie=null){
    const to=geometrie?{x:geometrie.x,y:geometrie.y}:centerOfCard(target);
    if(!to) return;
    const card=geometrie?null:document.getElementById(`playerCard${target}`);
    const r=geometrie||card?.getBoundingClientRect?.();
    activeKillFx.push({
      style:String(style||'classic'),
      source:Number(source),target:Number(target),
      x:to.x,y:to.y,
      w:r?.width||170,h:r?.height||110,
      start:performance.now(),
      duration:{
        lightning:820,flame:1050,venom:1050,blood:820,jackpot:1150,
        void:1200,confetti:1150,frost:1000,rift:1100,crown:1250,soulbreak:1350,
        solarsplash:1450,trigonbomb:1500,confettibomb:1550,polygon:1600,missile:1650,thunderstrike:1650,catattack:1750,quantumleap:1750,cometshower:1850,timefracture:1800,mirrorstorm:1900,dimensionbite:2050,runestrike:1900,koenigsfall:1250,dornenrequiem:1200
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
    const e=Math.min(1,t/.95),suits=['spade','heart','diamond','club'];
    for(let k=0;k<24;k++){
      const a=k*Math.PI*2/24+fx.seed;
      const d=e*(42+(k%6)*16);
      drawFxSprite(suits[k%4],fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d,30,(1-e)*.95,a,k%2?c1:c2,7);
    }
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
    drawFxSprite('crown',fx.x,y,72,.98,0,c2,24);
    const e=Math.max(0,(t-.42)/.58);
    impactFlash(fx.x,fx.y,c1,e,108,.55);impactRing(fx.x,fx.y,c1,e,132,4,.92);
    impactRing(fx.x,fx.y,c2,Math.min(1,e*1.18),92,2.2,.64);impactSparks(fx.x,fx.y,c2,e,18,108);
  }

  function killSoulbreak(fx,t){
    const [c1,c2]=labFxColor('soulbreak');
    const gather=Math.min(1,t/.42),collapse=t<.42?1:Math.max(.12,1-easeInOut((t-.42)/.2)*.88);
    drawSoulbreakSigil(fx.x,fx.y,38+gather*34,Math.max(0,1-t*.82),-t*6);
    drawSoulbreakCore(fx.x,fx.y,20+gather*11,fx.start+t*1000,Math.max(0,1-t*.72));
    drawSoulbreakCube(fx.x,fx.y,48,t*10+fx.seed,Math.max(0,1-t*.76),collapse);
    const e=Math.max(0,(t-.46)/.54);
    impactFlash(fx.x,fx.y,c1,e,112,.58);
    impactRing(fx.x,fx.y,c2,e,132,3.6,.84);
    impactRing(fx.x,fx.y,'#ffd978',Math.min(1,e*1.14),94,2,.72);
    impactSparks(fx.x,fx.y,c1,e,24,122);
  }

  function killSolarsplash(fx,t){
    const [c1,c2]=labFxColor('solarsplash');
    const gather=Math.min(1,t/.38),burst=Math.max(0,(t-.34)/.66);
    if(t<.58) drawSolarCore(fx.x,fx.y,18+gather*24,fx.start+t*1000,Math.max(0,1-t*.72));
    impactFlash(fx.x,fx.y,c1,burst,138,.68);
    ctx.save();ctx.globalCompositeOperation='lighter';
    for(let ring=0;ring<3;ring++){
      const q=Math.max(0,Math.min(1,burst-ring*.07));if(q<=0) continue;
      ctx.globalAlpha=(1-q)*(.92-ring*.18);ctx.strokeStyle=ring===1?c1:c2;ctx.lineWidth=4-ring;
      ctx.beginPath();ctx.ellipse(fx.x,fx.y,18+q*(118+ring*28),9+q*(46+ring*13),0,0,Math.PI*2);ctx.stroke();
    }
    ctx.restore();impactSparks(fx.x,fx.y,c2,burst,28,142);
  }

  function killTrigonbomb(fx,t){
    const [c1,c2]=labFxColor('trigonbomb'),gather=Math.min(1,t/.4);
    for(let i=0;i<3;i++){
      const a=i*Math.PI*2/3-t*7,d=(1-gather)*105+34;
      drawTriangleGlyph(fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d,20+gather*9,a+t*9,Math.max(0,1-t*.62),i===1?'#ffd45a':c2);
    }
    if(t<.54) drawTrigonCore(fx.x,fx.y,22+gather*20,fx.start+t*1000,Math.max(0,1-t*.58));
    const e=Math.max(0,(t-.38)/.62);
    impactFlash(fx.x,fx.y,c1,e,126,.6);
    for(let layer=0;layer<5;layer++){
      const q=Math.max(0,Math.min(1,e-layer*.055));
      if(q>0) drawTriangleGlyph(fx.x,fx.y,28+q*(92+layer*18),(layer%2?1:-1)*(t*8+q),Math.max(0,1-q)*(.94-layer*.11),layer%2?'#ffd45a':c2);
    }
    impactShards(fx.x,fx.y,c1,e,30,138);
  }

  function killConfettibomb(fx,t){
    const gather=Math.min(1,t/.4),burst=Math.max(0,(t-.36)/.64);
    if(t<.58){
      drawConfettiBombCore(fx.x,fx.y,20+gather*25,fx.start+t*1200,Math.max(0,1-t*.7));
      ctx.save();ctx.globalCompositeOperation='lighter';
      for(let i=0;i<4;i++){const a=i*Math.PI/2+t*8,d=(1-gather)*118+48;glowCircle(ctx,fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d,5+i,'#'+['ff5fbc','4ad7ff','ffd45a','68ed96'][i],Math.max(0,1-t*.68)*.55);}
      ctx.restore();
    }
    impactFlash(fx.x,fx.y,'#fff4bf',burst,148,.72);impactRing(fx.x,fx.y,'#ffd45a',burst,156,4,.94);impactRing(fx.x,fx.y,'#ff5fbc',Math.min(1,burst*1.13),116,2.4,.72);
    for(let k=0;k<58&&burst>0&&burst<1;k++){
      const a=k*2.399+fx.seed,d=burst*(48+(k%10)*13),px=fx.x+Math.cos(a)*d,py=fx.y+Math.sin(a)*d+burst*burst*(k%6)*9;
      ctx.save();ctx.translate(px,py);ctx.rotate(a+burst*(7+k%5));ctx.globalAlpha=(1-burst)*.92;ctx.fillStyle=['#ffd45a','#fff4bf','#4ad7ff','#ff5fbc','#68ed96','#b06cff'][k%6];
      if(k%11===0){ctx.beginPath();for(let i=0;i<10;i++){const q=i*Math.PI/5,r=i%2?4:9;const sx=Math.cos(q)*r,sy=Math.sin(q)*r;i?ctx.lineTo(sx,sy):ctx.moveTo(sx,sy);}ctx.closePath();ctx.fill();}
      else if(k%8===0){ctx.fillRect(-6,-6,12,12);ctx.fillStyle='#0d3975';ctx.beginPath();ctx.arc(0,0,1.8,0,Math.PI*2);ctx.fill();}
      else ctx.fillRect(-7,-2.5,14,5);ctx.restore();
    }
  }

  function killPolygon(fx,t){
    const gather=Math.min(1,t/.42),fracture=Math.max(0,(t-.38)/.62);
    if(t<.56){
      glowCircle(ctx,fx.x,fx.y,42+gather*78,'#4a2273',Math.max(0,1-t*.8)*.4);
      for(let layer=0;layer<5;layer++)drawPolygonGlyph(fx.x,fx.y,32+gather*(28+layer*17),6+layer,(layer%2?1:-1)*(t*(5+layer)+layer),Math.max(0,1-t*.68)*(.95-layer*.1),layer===0);
    }
    impactFlash(fx.x,fx.y,'#ffffff',fracture,142,.66);impactRing(fx.x,fx.y,'#75ffe1',fracture,158,3.8,.88);impactRing(fx.x,fx.y,'#9d72ff',Math.min(1,fracture*1.12),126,2.5,.74);
    for(let k=0;k<42&&fracture>0&&fracture<1;k++){
      const a=k*2.399+fx.seed,d=fracture*(42+(k%9)*15),px=fx.x+Math.cos(a)*d,py=fx.y+Math.sin(a)*d*.76;
      drawTriangleGlyph(px,py,6+(k%5)*2.5,a+fracture*(8+k%4),(1-fracture)*.9,k%3===0?'#ffd45a':k%2?'#75ffe1':'#9d72ff');
    }
  }

  function killMissile(fx,t){
    const r=Math.min(fx.w,fx.h)*.55;ctx.save();ctx.translate(fx.x,fx.y);ctx.rotate(t*4);ctx.globalAlpha=Math.max(0,1-t*1.15);ctx.strokeStyle='#ff704f';ctx.lineWidth=2.5;ctx.beginPath();ctx.arc(0,0,r,0,Math.PI*2);ctx.stroke();ctx.restore();
    for(let i=0;i<5;i++){const p=(t-(.05+i*.055))/.53;if(p<=0||p>=1)continue;const from={x:fx.x+(i-2)*r*.72,y:fx.y-r*3},fake={from,to:{x:fx.x+(i-2)*6,y:fx.y+(i%2?8:-5)}},pos=missilePoint(fake,p,(i-2)*4),prev=missilePoint(fake,Math.max(0,p-.025),(i-2)*4);drawMissileGlyph(pos.x,pos.y,12,Math.atan2(pos.y-prev.y,pos.x-prev.x),1);}
    const burst=Math.max(0,(t-.48)/.52);impactFlash(fx.x,fx.y,'#fff4bf',burst,158,.76);impactRing(fx.x,fx.y,'#ff704f',burst,168,4,.9);impactRing(fx.x,fx.y,'#ffd45a',Math.min(1,burst*1.14),128,2.8,.76);impactSparks(fx.x,fx.y,'#ffd45a',burst,34,156);
  }

  function killThunderstrike(fx,t){
    const charge=Math.min(1,t/.34),burst=Math.max(0,(t-.28)/.72),r=Math.min(fx.w,fx.h);
    if(t<.52){glowCircle(ctx,fx.x,fx.y-r*.65,r*(.6+charge*.8),'#4a8ff0',charge*.3);for(let i=0;i<5;i++){ctx.save();ctx.translate(fx.x,fx.y);ctx.rotate(i*Math.PI*2/5-t*5);ctx.globalAlpha=charge*.75;ctx.strokeStyle=i%2?'#75ffe1':'#b06cff';ctx.lineWidth=2;ctx.beginPath();ctx.arc(0,0,r*(.28+i*.11),0,Math.PI*1.35);ctx.stroke();ctx.restore();}}
    if(t>.26&&t<.66){const a=Math.min(1,(t-.26)/.045)*Math.max(0,1-(t-.55)/.11);drawThunderBolt(fx.x+22,-30,fx.x,fx.y,fx.seed,15,'#75ffe1',a,true);for(let i=0;i<4;i++)drawThunderBolt(fx.x+(i-1.5)*75,-22,fx.x+(i-1.5)*10,fx.y,fx.seed+13*i,3,i%2?'#b06cff':'#8ed8ff',a*.58,true);}
    impactFlash(fx.x,fx.y,'#ffffff',burst,176,.86);impactRing(fx.x,fx.y,'#75ffe1',burst,182,5,.95);impactRing(fx.x,fx.y,'#b06cff',Math.min(1,burst*1.14),142,3,.78);impactSparks(fx.x,fx.y,'#fff4bf',burst,38,174);
  }

  function killCatattack(fx,t){
    const gather=Math.min(1,t/.3),strike=Math.max(0,(t-.34)/.66),r=Math.min(fx.w,fx.h);
    if(t<.56){glowCircle(ctx,fx.x,fx.y,r*(.35+gather*.6),'#4a2273',Math.max(0,1-t*.9)*.42);drawBattleCat(fx.x,fx.y-r*(.85-gather*.55),r*.32,-Math.PI/2+t*5,Math.max(0,1-t*.68));}
    for(let s=0;s<5;s++){const q=Math.max(0,Math.min(1,(t-(.32+s*.055))/.3));if(q<=0||q>=1)continue;ctx.save();ctx.translate(fx.x+(s-2)*7,fx.y);ctx.rotate(-.88+s*.21);ctx.globalAlpha=(1-q)*.96;ctx.strokeStyle=s%2?'#75ffe1':'#ffd45a';ctx.shadowColor=ctx.strokeStyle;ctx.shadowBlur=22;ctx.lineWidth=6;for(let c=-1;c<=1;c++){ctx.beginPath();ctx.moveTo(-r*.78,c*14);ctx.quadraticCurveTo(0,-r*.34+c*10,lerp(-r*.78,r*.86,q),c*11);ctx.stroke();}ctx.restore();}
    impactFlash(fx.x,fx.y,'#b06cff',strike,148,.7);impactRing(fx.x,fx.y,'#ffd45a',strike,158,4,.9);impactRing(fx.x,fx.y,'#75ffe1',Math.min(1,strike*1.12),124,2.6,.72);for(let i=0;i<18;i++){const a=i*Math.PI*2/18+fx.seed,d=strike*(48+(i%5)*19);drawPawGlyph(fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d*.72,6+i%3,a,(1-strike)*.7,i%2?'#75ffe1':'#ffd45a');}
  }

  function killQuantumleap(fx,t){
    const gather=Math.min(1,t/.34),collapse=Math.max(0,(t-.42)/.58),r=Math.min(fx.w,fx.h);
    if(t<.62){glowCircle(ctx,fx.x,fx.y,r*(.3+gather*.7),'#4a2273',Math.max(0,1-t*.8)*.44);for(let i=0;i<5;i++)drawQuantumRing(fx.x,fx.y,r*(.2+i*.11+gather*.25),r*(.08+i*.055+gather*.12),(i%2?1:-1)*(t*(5+i)+i),Math.max(0,1-t*.7)*(.9-i*.1),i%2?'#75ffe1':'#b06cff');for(let i=0;i<32;i++){const a=i*2.399+t*6,d=(1-gather)*r*1.5+r*(.22+i%5*.08);drawQuantumFragment(fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d*.72,4+i%4,a-t*9,Math.max(0,1-t*.66)*.78,i%3?'#75ffe1':'#ffd45a');}}
    impactFlash(fx.x,fx.y,'#ffffff',collapse,166,.8);impactRing(fx.x,fx.y,'#75ffe1',collapse,176,4.5,.94);impactRing(fx.x,fx.y,'#b06cff',Math.min(1,collapse*1.13),138,3,.78);impactShards(fx.x,fx.y,'#75ffe1',collapse,38,166);
  }

  function killCometshower(fx,t){
    const r=Math.min(fx.w,fx.h);for(let i=0;i<10;i++){const p=(t-(.02+i*.038))/.42;if(p<=0||p>=1)continue;const fake={to:{x:fx.x+(i-4.5)*5,y:fx.y+(i%3-1)*7}},lane=(i-4.5)*.7,pos=cometShowerPoint(fake,p,lane),next=cometShowerPoint(fake,Math.min(1,p+.01),lane);drawCometGlyph(pos.x,pos.y,7+i%3,Math.atan2(next.y-pos.y,next.x-pos.x),1);}
    const main=(t-.38)/.3;if(main>0&&main<1){const fake={to:{x:fx.x,y:fx.y}},pos=cometShowerPoint(fake,main,0),next=cometShowerPoint(fake,Math.min(1,main+.01),0);drawCometGlyph(pos.x,pos.y,r*.24,Math.atan2(next.y-pos.y,next.x-pos.x),1,true);}
    const burst=Math.max(0,(t-.58)/.42);impactFlash(fx.x,fx.y,'#fff4bf',burst,184,.9);impactRing(fx.x,fx.y,'#ff704f',burst,188,5,.96);impactRing(fx.x,fx.y,'#ffd45a',Math.min(1,burst*1.12),148,3,.8);impactSparks(fx.x,fx.y,'#ffd45a',burst,42,178);
  }

  function killTimefracture(fx,t){
    const gather=Math.min(1,t/.35),burst=Math.max(0,(t-.48)/.52),r=Math.min(fx.w,fx.h);
    if(t<.72){for(let i=0;i<4;i++)drawClockRing(fx.x,fx.y,r*(.2+i*.13+gather*.18),(i%2?1:-1)*(t*(6+i)+i),Math.max(0,1-t*.72)*(.95-i*.12));for(let i=0;i<8;i++){const a=i*Math.PI/4-t*5,d=(1-gather)*r*1.4+r*(.25+i%3*.12);drawTimeShard(fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d*.66,8+i%3,a,Math.max(0,1-t*.68));}}
    for(let echo=0;echo<5;echo++){const q=Math.max(0,Math.min(1,(t-(.4+echo*.045))/.3));if(q>0){const a=echo*Math.PI*2/5,ox=Math.cos(a)*r*.24,oy=Math.sin(a)*r*.18;impactFlash(fx.x+ox,fx.y+oy,echo%2?'#75ffe1':'#ffd45a',q,76,.58);}}
    impactFlash(fx.x,fx.y,'#ffffff',burst,164,.8);impactRing(fx.x,fx.y,'#ffd45a',burst,174,4.5,.94);impactRing(fx.x,fx.y,'#75ffe1',Math.min(1,burst*1.14),136,3,.76);impactShards(fx.x,fx.y,'#75ffe1',burst,34,160);
  }

  function killMirrorstorm(fx,t){
    const form=Math.min(1,t/.32),burst=Math.max(0,(t-.62)/.38),r=Math.min(fx.w,fx.h),mirrors=[];
    for(let i=0;i<12;i++){const a=-Math.PI/2+i*Math.PI/6,d=(1-form)*18+r*.78,point={x:fx.x+Math.cos(a)*d,y:fx.y+Math.sin(a)*d*.66};mirrors.push(point);if(t<.72)drawMirrorShard(point.x,point.y,r*.13,r*.29,a+Math.PI/2,Math.max(0,1-t*.68),true);}
    if(t>.25&&t<.62){const steps=Math.min(12,Math.floor((t-.25)/.029));for(let i=0;i<steps;i++)drawMirrorBeam(mirrors[i],mirrors[(i*5+7)%12],i%3?'#75ffe1':'#ffd45a',.72,2.2);}
    const converge=Math.max(0,Math.min(1,(t-.48)/.12))*Math.max(0,1-(t-.64)/.1);if(converge>0)for(let i=0;i<12;i++)drawMirrorBeam(mirrors[i],{x:fx.x,y:fx.y},i%2?'#75ffe1':'#fff4bf',converge,3);
    impactFlash(fx.x,fx.y,'#ffffff',burst,178,.88);impactRing(fx.x,fx.y,'#75ffe1',burst,184,4.5,.94);impactRing(fx.x,fx.y,'#ffd45a',Math.min(1,burst*1.13),146,3,.78);for(let i=0;i<56;i++){const a=i*2.399,d=burst*(46+(i%9)*16);drawMirrorShard(fx.x+Math.cos(a)*d,fx.y+Math.sin(a)*d*.68,4+i%4,9+i%6,a+burst*(8+i%3),(1-burst)*.86,i%4===0);}
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
      case 'soulbreak':killSoulbreak(fx,t);break;
      case 'solarsplash':killSolarsplash(fx,t);break;
      case 'trigonbomb':killTrigonbomb(fx,t);break;
      case 'confettibomb':killConfettibomb(fx,t);break;
      case 'polygon':killPolygon(fx,t);break;
      case 'missile':killMissile(fx,t);break;
      case 'thunderstrike':killThunderstrike(fx,t);break;
      case 'catattack':killCatattack(fx,t);break;
      case 'quantumleap':killQuantumleap(fx,t);break;
      case 'cometshower':killCometshower(fx,t);break;
      case 'timefracture':killTimefracture(fx,t);break;
      case 'mirrorstorm':killMirrorstorm(fx,t);break;
      case 'dimensionbite':killRift(fx,t);break;
      case 'runestrike':killCrown(fx,t);break;
      case 'koenigsfall':killCrown(fx,t);break;
      case 'dornenrequiem':killVoid(fx,t);break;
      default:killArc(fx,t);break;
    }
    return true;
  }




  function makeFxEvent(event){
    const sourceIndex=Number(event.source),targetIndex=Number(event.target);
    // Die Shop-Vorschau liefert Start und Ziel als Punkte, der Kampf ueber die Spielerkarten.
    const punkt=p=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y)?{x:Number(p.x),y:Number(p.y)}:null;
    const from=punkt(event.from)||centerOfCard(sourceIndex),to=punkt(event.to)||centerOfCard(targetIndex);
    if(!from||!to) return null;
    const style=knownStyle(event.style||sourceStyle(sourceIndex));
    return {
      id:String(event.id||`${Date.now().toString(36)}-${Math.random().toString(36).slice(2,7)}`),
      source:sourceIndex,target:targetIndex,
      style,
      kind:String(event.kind||event.variant||"laser"),
      amount:Number(event.amount)||0,
      face:event.face==null?null:Number(event.face),
      from,to,start:performance.now(),duration:style==='soulbreak'?1200:style==='solarsplash'?1250:style==='trigonbomb'?1300:style==='confettibomb'?1350:style==='polygon'?1320:style==='missile'?1400:style==='thunderstrike'?1380:style==='catattack'?1450:style==='quantumleap'?1450:style==='cometshower'?1550:style==='timefracture'?1500:style==='mirrorstorm'?1580:style==='dimensionbite'?2050:style==='runestrike'?1750:style==='koenigsfall'?2000:style==='dornenrequiem'?2000:760,
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

    const source=Number.isInteger(fx.source)?document.getElementById(`playerCard${fx.source}`):null;
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

  /* Vorschau im Shop: Effekt zwischen zwei freien Punkten und Kill auf einem
     freien Rechteck, ohne Spielerkarten. Die Leinwand liegt im Kampf auf Ebene 1;
     ueber dem Shop-Fenster hebt der Aufrufer sie mit ebene() an und senkt sie danach. */
  function spielenAn(style,from,to){
    const fx=makeFxEvent({style:knownStyle(style),source:null,target:null,from,to,kind:"vorschau"});
    if(!fx) return 0;
    activeLabFx.push(fx);
    return fx.duration;
  }
  function killAn(style,rechteck){
    const resolved=knownStyle(style);
    const r={x:Number(rechteck?.x)||0,y:Number(rechteck?.y)||0,width:Number(rechteck?.width)||170,height:Number(rechteck?.height)||110};
    addKillFx(resolved,-1,-1,true,{x:r.x,y:r.y,width:r.width,height:r.height});
    return activeKillFx[activeKillFx.length-1]?.duration||900;
  }
  // Der Effekt-Layer bildet einen eigenen Stapelkontext; ein hoher z-index der
  // Leinwand darin bleibt unter dem Vorschaufenster. Fuer die Vorschau haengt
  // die Leinwand deshalb direkt im Body und kehrt danach in den Layer zurueck.
  function ebene(z){
    if(z==null){canvas.style.zIndex="1";if(canvas.parentElement!==domLayer) domLayer.appendChild(canvas);return;}
    canvas.style.zIndex=String(z);
    if(canvas.parentElement!==document.body) document.body.appendChild(canvas);
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


  // Main-game Hot Dice canvas. Test Lab keeps its own preview renderer.
  const hotCanvas=document.createElement("canvas");
  hotCanvas.id="hotDiceFireCanvasMain";
  hotCanvas.setAttribute("aria-hidden","true");
  hotCanvas.style.cssText="position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0;";
  domLayer.appendChild(hotCanvas);
  const hotCtx=hotCanvas.getContext("2d");
  let hotParticles=[];
  let hotLast=performance.now();

  function inTestLab(){
    try{return gameContext?.mode==="test-lab";}catch(_){return false;}
  }

  function resizeHot(){
    const dpr=Math.min(2,window.devicePixelRatio||1);
    const w=Math.max(1,window.innerWidth),h=Math.max(1,window.innerHeight);
    if(hotCanvas.width!==Math.round(w*dpr)||hotCanvas.height!==Math.round(h*dpr)){
      hotCanvas.width=Math.round(w*dpr);hotCanvas.height=Math.round(h*dpr);
      hotCanvas.style.width=w+"px";hotCanvas.style.height=h+"px";
      hotCtx.setTransform(dpr,0,0,dpr,0,0);
    }
  }

  function hotLevel(){
    if(inTestLab()) return 0;
    try{
      const streak=Number(players?.[current]?.hotDiceStreak)||0;
      return streak>=5?5:streak>=4?4:streak>=3?3:0;
    }catch(_){return 0;}
  }

  function spawnHotFlame(r,level){
    const center=r.left+r.width*(.2+Math.random()*.6);
    const baseY=r.bottom-r.height*(.04+Math.random()*.12);
    const strength=level>=5?1.22:level>=4?1.05:.9;
    hotParticles.push({
      x:center,y:baseY,
      vx:(Math.random()-.5)*12,
      vy:-(28+Math.random()*30)*strength,
      life:0,
      ttl:.52+Math.random()*.34,
      width:(3.2+Math.random()*3.8)*strength,
      height:(14+Math.random()*14)*strength,
      sway:(Math.random()-.5)*18,
      phase:Math.random()*Math.PI*2,
      level
    });
  }

  function spawnHot(dt,level){
    const dice=[...document.querySelectorAll('#dice .die')].filter(el=>el.offsetParent!==null);
    if(!dice.length||level<3) return;
    const pps=level>=5?6.5:level>=4?4.8:3.4;
    const chance=Math.min(.35,(dt/1000)*pps);
    for(const die of dice){
      const r=die.getBoundingClientRect();
      if(Math.random()<chance) spawnHotFlame(r,level);
      if(level>=5&&Math.random()<chance*.22) spawnHotFlame(r,level);
    }
    if(hotParticles.length>85) hotParticles.splice(0,hotParticles.length-85);
  }

  function drawHotFlame(p){
    const t=p.life/p.ttl;
    const fade=Math.sin(Math.min(1,t)*Math.PI);
    const sway=Math.sin(p.phase+p.life*8.1)*p.sway*(.10+t*.50);
    const bend=Math.sin(p.phase*.8+p.life*4.7)*p.width*.85;
    const x=p.x+sway;
    const y=p.y;
    const h=p.height*(.72+t*.74);
    const w=p.width*(1-t*.34);

    hotCtx.save();
    hotCtx.translate(x,y);
    hotCtx.globalCompositeOperation='lighter';

    const outer=hotCtx.createLinearGradient(0,4,0,-h);
    outer.addColorStop(0,'rgba(90,0,14,0)');
    outer.addColorStop(.10,`rgba(125,0,18,${.12*fade})`);
    outer.addColorStop(.32,`rgba(210,5,31,${.24*fade})`);
    outer.addColorStop(.56,`rgba(255,38,58,${.29*fade})`);
    outer.addColorStop(.76,`rgba(255,105,118,${.20*fade})`);
    outer.addColorStop(.91,`rgba(255,195,200,${.08*fade})`);
    outer.addColorStop(1,'rgba(255,225,228,0)');
    hotCtx.fillStyle=outer;

    hotCtx.beginPath();
    hotCtx.moveTo(-w*.9,2);
    hotCtx.bezierCurveTo(-w*1.12,-h*.16,-w*.72,-h*.40,-w*.34,-h*.57);
    hotCtx.bezierCurveTo(-w*.05,-h*.70,bend*.15,-h*.84,bend,-h);
    hotCtx.bezierCurveTo(w*.28,-h*.82,w*.78,-h*.57,w*.96,-h*.30);
    hotCtx.bezierCurveTo(w*1.10,-h*.10,w*.72,1,w*.20,3);
    hotCtx.bezierCurveTo(-w*.16,4,-w*.60,4,-w*.9,2);
    hotCtx.fill();

    const side=Math.sin(p.phase)>0?1:-1;
    const sh=h*(.43+.10*Math.sin(p.phase*1.6));
    hotCtx.globalAlpha=.68;
    hotCtx.beginPath();
    hotCtx.moveTo(side*w*.15,1);
    hotCtx.bezierCurveTo(side*w*.42,-sh*.16,side*w*.74,-sh*.40,side*w*.58,-sh*.62);
    hotCtx.bezierCurveTo(side*w*.44,-sh*.78,side*w*.18,-sh*.90,side*w*.03,-sh);
    hotCtx.bezierCurveTo(side*(-w*.06),-sh*.66,side*(-w*.01),-sh*.22,side*w*.15,1);
    hotCtx.fill();

    if(p.level>=4){
      const inner=hotCtx.createLinearGradient(0,0,0,-h*.68);
      inner.addColorStop(0,'rgba(255,55,72,0)');
      inner.addColorStop(.34,`rgba(255,82,98,${.08*fade})`);
      inner.addColorStop(.62,`rgba(255,150,158,${.10*fade})`);
      inner.addColorStop(1,'rgba(255,228,230,0)');
      hotCtx.globalAlpha=.86;
      hotCtx.fillStyle=inner;
      hotCtx.beginPath();
      hotCtx.moveTo(-w*.23,0);
      hotCtx.bezierCurveTo(-w*.18,-h*.18,-w*.06,-h*.38,bend*.10,-h*.62);
      hotCtx.bezierCurveTo(w*.16,-h*.39,w*.27,-h*.18,w*.23,0);
      hotCtx.closePath();
      hotCtx.fill();
    }
    hotCtx.restore();
  }

  function hotFrame(now){
    resizeHot();
    const dt=Math.min(34,now-hotLast);hotLast=now;
    const level=hotLevel();
    if(level>=3) spawnHot(dt,level);

    hotCtx.clearRect(0,0,window.innerWidth,window.innerHeight);
    const sec=dt/1000;
    hotParticles=hotParticles.filter(p=>{
      p.life+=sec;
      if(p.life>=p.ttl) return false;
      p.x+=p.vx*sec;
      p.y+=p.vy*sec;
      p.vx*=.992;
      drawHotFlame(p);
      return true;
    });
    requestAnimationFrame(hotFrame);
  }
  requestAnimationFrame(hotFrame);

  function frame(now){
    resize();
    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    activeLabFx=activeLabFx.filter(fx=>drawLabFx(fx,now));
    activeKillFx=activeKillFx.filter(fx=>drawKillFx(fx,now));
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  window.WDAttackFx=Object.freeze({
    emit,play,kill,spielenAn,killAn,ebene,
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
