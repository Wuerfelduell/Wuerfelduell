
(() => {
  const $lab=id=>document.getElementById(id);
  const hub=$lab('tutorialHubModal');
  const picker=$lab('testLabAbilityModal');
  const grid=$lab('testLabAbilityGrid');
  const counter=$lab('testLabAbilityCounter');
  const startBtn=$lab('testLabStartBtn');
  const selected=[];
  let hotDemoLevel=0;
  let benchCollapsed=false;

  if(!hub || !picker || !grid || !startBtn) return;

  function inLab(){return gameContext?.mode==='test-lab';}
  function closeHub(){hub.classList.add('hidden');}
  function closePicker(){picker.classList.add('hidden');}
  function openHub(){
    resetTutorialUi?.();
    picker.classList.add('hidden');
    hub.classList.remove('hidden');
  }

  function renderAbilityPicker(){
    selected.splice(0,selected.length);
    grid.innerHTML='';
    const ids=(typeof CHOOSABLE_ABILITY_IDS!=='undefined'?CHOOSABLE_ABILITY_IDS:REAL_ABILITY_IDS).filter(id=>id&&ABILITIES[id]);
    ids.forEach(id=>{
      const data=ABILITIES[id];
      const btn=document.createElement('button');
      btn.type='button';
      btn.className='test-lab-ability';
      btn.innerHTML=`<strong>${escapeHtml(data.name)}</strong><span>${escapeHtml(data.desc||data.description||'')}</span>`;
      btn.addEventListener('click',()=>{
        const at=selected.indexOf(id);
        if(at>=0) selected.splice(at,1);
        else if(selected.length<2) selected.push(id);
        else return;
        [...grid.children].forEach((el,i)=>el.classList.toggle('selected',selected.includes(ids[i])));
        counter.textContent=`${selected.length} / 2 gewählt`;
        startBtn.disabled=selected.length!==2;
      });
      grid.appendChild(btn);
    });
    counter.textContent='0 / 2 gewählt';
    startBtn.disabled=true;
  }

  function openPicker(){
    closeHub();
    renderAbilityPicker();
    picker.classList.remove('hidden');
  }

  function addOption(select,value,label){
    const o=document.createElement('option');
    o.value=String(value);o.textContent=String(label);select.appendChild(o);
  }

  function makeSelect(labelText,id){
    const wrap=document.createElement('label');
    wrap.className='test-lab-bench-control';
    const span=document.createElement('span');span.textContent=labelText;
    const select=document.createElement('select');select.id=id;
    wrap.append(span,select);
    return {wrap,select};
  }

  function bannerPresets(){
    return {
      default:{name:'Standard',bg:'',accent:''},
      ember:{name:'Ember Red',bg:'linear-gradient(135deg,rgba(70,3,8,.92),rgba(26,5,9,.96))',accent:'#ff334d'},
      crimson:{name:'Crimson',bg:'linear-gradient(135deg,rgba(95,0,28,.9),rgba(35,0,12,.96))',accent:'#ff2b67'},
      void:{name:'Void',bg:'linear-gradient(135deg,rgba(32,8,55,.94),rgba(8,7,20,.98))',accent:'#a86cff'},
      frost:{name:'Frost',bg:'linear-gradient(135deg,rgba(11,41,60,.94),rgba(7,18,28,.98))',accent:'#66d7ff'},
      toxic:{name:'Toxic',bg:'linear-gradient(135deg,rgba(13,54,32,.94),rgba(5,22,14,.98))',accent:'#61ff7a'},
      royal:{name:'Royal',bg:'linear-gradient(135deg,rgba(70,45,4,.92),rgba(27,18,5,.98))',accent:'#ffc94a'}
    };
  }

  function applyWorkbench(){
    if(!inLab()||!players?.[0]) return;
    const card=document.getElementById('playerCard0');
    if(card){
      const preset=bannerPresets()[players[0].labBanner||'default']||bannerPresets().default;
      card.classList.add('test-lab-profile-card');
      card.style.setProperty('--lab-banner-bg',preset.bg||'');
      card.style.setProperty('--lab-banner-accent',preset.accent||'');
      card.dataset.labBanner=players[0].labBanner||'default';
    }
    const dice=$lab('dice');
    if(dice){
      const actual=Number(players?.[current]?.hotDiceStreak)||0;
      const level=hotDemoLevel||actual;
      dice.dataset.labHotLevel=String(level);
      dice.classList.toggle('lab-hot-fire',level>=3&&current===0);
      dice.classList.toggle('lab-hot-fire-4',level>=4&&current===0);
      dice.classList.toggle('lab-hot-fire-5',level>=5&&current===0);
    }
  }

  function createWorkbench(){
    document.getElementById('testLabWorkbench')?.remove();
    const bench=document.createElement('aside');
    bench.id='testLabWorkbench';
    bench.className='test-lab-workbench';
    bench.innerHTML=`
      <div class="test-lab-bench-head">
        <div><strong>🧪 FX-Werkbank</strong><small>Nur Testumgebung · nichts wird gespeichert</small></div>
        <button type="button" id="testLabBenchToggle">−</button>
      </div>
      <div id="testLabBenchBody" class="test-lab-bench-body"></div>`;
    document.getElementById('game')?.prepend(bench);

    const body=bench.querySelector('#testLabBenchBody');

    const diceCtl=makeSelect('🎲 Würfeldesign','testLabDiceSelect');
    Object.entries(typeof DICE_DESIGNS!=='undefined'?DICE_DESIGNS:{classic:{name:'Classic'}})
      .forEach(([k,v])=>addOption(diceCtl.select,k,v?.name||k));
    diceCtl.select.value=players[0]?.diceDesign||'classic';
    diceCtl.select.addEventListener('change',()=>{
      players[0].diceDesign=diceCtl.select.value;
      renderAll?.();requestAnimationFrame(applyWorkbench);
    });

    const fxCtl=makeSelect('✨ Attack-FX','testLabFxSelect');
    Object.entries(typeof ATTACK_FX_STYLES!=='undefined'?ATTACK_FX_STYLES:{classic:{name:'Classic'}})
      .forEach(([k,v])=>addOption(fxCtl.select,k,v?.name||k));
    fxCtl.select.value=players[0]?.attackFx||'classic';
    fxCtl.select.addEventListener('change',()=>{players[0].attackFx=fxCtl.select.value;});

    const frameCtl=makeSelect('🖼️ Rahmen','testLabFrameSelect');
    addOption(frameCtl.select,'','Standard');
    const frames=(typeof PRESTIGE_SHOP_ITEMS!=='undefined'?PRESTIGE_SHOP_ITEMS:[])
      .filter(x=>x.type==='frame');
    frames.forEach(x=>addOption(frameCtl.select,x.value,x.name));
    frameCtl.select.value=players[0]?.cosmeticFrame||'';
    frameCtl.select.addEventListener('change',()=>{
      players[0].cosmeticFrame=frameCtl.select.value||'';
      renderAll?.();requestAnimationFrame(applyWorkbench);
    });

    const bannerCtl=makeSelect('🎨 Banner / Profilfläche','testLabBannerSelect');
    Object.entries(bannerPresets()).forEach(([k,v])=>addOption(bannerCtl.select,k,v.name));
    bannerCtl.select.value=players[0]?.labBanner||'default';
    bannerCtl.select.addEventListener('change',()=>{
      players[0].labBanner=bannerCtl.select.value;
      applyWorkbench();
    });

    const hotCtl=makeSelect('🔥 Hot Dice Demo','testLabHotSelect');
    [['0','Echte Streak'],['3','Streak 3'],['4','Streak 4'],['5','Streak 5+']].forEach(([v,n])=>addOption(hotCtl.select,v,n));
    hotCtl.select.value=String(hotDemoLevel);
    hotCtl.select.addEventListener('change',()=>{
      hotDemoLevel=Number(hotCtl.select.value)||0;
      applyWorkbench();
    });

    const preview=document.createElement('div');
    preview.className='test-lab-preview-actions';
    const fxBtn=document.createElement('button');
    fxBtn.type='button';fxBtn.className='secondary';fxBtn.textContent='💥 Attack-FX testen';
    fxBtn.addEventListener('click',()=>{
      if(!inLab()) return;
      const old=players[0].attackFx;
      players[0].attackFx=fxCtl.select.value;
      window.WDAttackFx?.emit?.(0,1,'lab-preview',6,6);
      players[0].attackFx=old;
    });
    const hotBtn=document.createElement('button');
    hotBtn.type='button';hotBtn.className='secondary';hotBtn.textContent='🔥 Hot Dice 3→4→5';
    hotBtn.addEventListener('click',()=>{
      let level=3;
      hotDemoLevel=level;hotCtl.select.value=String(level);applyWorkbench();
      const timer=setInterval(()=>{
        level++;
        if(level>5){clearInterval(timer);setTimeout(()=>{hotDemoLevel=0;hotCtl.select.value='0';applyWorkbench();},1100);return;}
        hotDemoLevel=level;hotCtl.select.value=String(level);applyWorkbench();
      },1100);
    });
    preview.append(fxBtn,hotBtn);

    body.append(diceCtl.wrap,fxCtl.wrap,frameCtl.wrap,bannerCtl.wrap,hotCtl.wrap,preview);

    bench.querySelector('#testLabBenchToggle').addEventListener('click',()=>{
      benchCollapsed=!benchCollapsed;
      body.classList.toggle('hidden',benchCollapsed);
      bench.querySelector('#testLabBenchToggle').textContent=benchCollapsed?'+':'−';
    });
  }

  function startTestLab(){
    if(selected.length!==2) return;
    closePicker();
    startTutorial();
    resetTutorialUi();
    tutorialMode=false;
    campaignMode=false;
    if(typeof duoCampaignMode!=='undefined') duoCampaignMode=false;
    if(typeof trioCampaignMode!=='undefined') trioCampaignMode=false;
    gameContext={mode:'test-lab',returnScreen:'menu',profileId:null,encounterId:null};
    document.body.classList.add('test-lab-active');

    Object.assign(players[0],{
      name:'Du',profileId:null,botLevel:'human',hp:25,maxHp:25,
      ability:selected[0],secondAbility:selected[1],thirdAbility:null,
      secondAbilityUnlocked:true,thirdAbilityUnlocked:false,
      rolledAbility:'TEST',primaryWasChosen:true,secondAbilityWasChosen:true,thirdAbilityWasChosen:false,
      attackFx:'classic',cosmeticFrame:'',labBanner:'default'
    });
    Object.assign(players[1],{
      name:'Test-Bot',profileId:null,botLevel:'easy',hp:100,maxHp:100,
      ability:0,secondAbility:null,thirdAbility:null,
      secondAbilityUnlocked:false,thirdAbilityUnlocked:false,
      rolledAbility:'TEST',primaryWasChosen:false,secondAbilityWasChosen:false,thirdAbilityWasChosen:false
    });

    resetRoundStats();
    prepareBloodRushForTurn(current);
    addLog(`🧪 Testumgebung: ${ABILITIES[selected[0]].name} + ${ABILITIES[selected[1]].name} · Test-Bot 100 HP · nur 5er/6er Würfel · kein Save.`);
    renderAll();
    requestAnimationFrame(()=>{createWorkbench();applyWorkbench();});
  }

  const menuTutorial=$lab('menuTutorialBtn');
  if(menuTutorial) menuTutorial.onclick=openHub;
  $lab('tutorialHubStartBtn').onclick=()=>{closeHub();document.body.classList.remove('test-lab-active');startTutorial();};
  $lab('tutorialHubLabBtn').onclick=openPicker;
  $lab('tutorialHubCancelBtn').onclick=closeHub;
  $lab('testLabBackBtn').onclick=()=>{closePicker();openHub();};
  startBtn.onclick=startTestLab;

  // Test dice: exactly 5 or 6 for player and bot.
  if(typeof randDieForPlayer==='function'){
    const normalRandDieForPlayer=randDieForPlayer;
    randDieForPlayer=function(index){
      if(inLab()) return Math.random()<0.5?5:6;
      return normalRandDieForPlayer(index);
    };
  }

  // -------------------------------------------------
  // V27.6.8 — LAB ONLY: premium visual FX playground
  // -------------------------------------------------

  const fxCanvas=document.createElement('canvas');
  fxCanvas.id='testLabFxCanvas';
  fxCanvas.setAttribute('aria-hidden','true');
  document.body.appendChild(fxCanvas);
  const fxCtx=fxCanvas.getContext('2d',{alpha:true});

  const fireCanvas=document.createElement('canvas');
  fireCanvas.id='testLabFireCanvas';
  fireCanvas.setAttribute('aria-hidden','true');
  document.body.appendChild(fireCanvas);
  const fireCtx=fireCanvas.getContext('2d',{alpha:true});

  let dpr=1;
  let fireParticles=[];
  let activeLabFx=[];
  let fireLast=performance.now();
  let fxLast=performance.now();

  function resizeFxCanvases(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    const w=window.innerWidth,h=window.innerHeight;
    for(const [canvas,ctx] of [[fxCanvas,fxCtx],[fireCanvas,fireCtx]]){
      const cw=Math.round(w*dpr),ch=Math.round(h*dpr);
      if(canvas.width!==cw||canvas.height!==ch){
        canvas.width=cw;canvas.height=ch;
        canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
        ctx.setTransform(dpr,0,0,dpr,0,0);
      }
    }
  }

  function cardCenter(index){
    const el=document.getElementById(`playerCard${index}`);
    const r=el?.getBoundingClientRect?.();
    return r?{x:r.left+r.width/2,y:r.top+r.height/2}:null;
  }

  function selectedLabFx(){
    return String(players?.[0]?.attackFx||'classic');
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
      crown:['#fff1a8','#ffc43d']
    }[style]||['#ffffff','#77bfff'];
  }

  function labEmit(source,target,kind='lab-preview',amount=0,face=null){
    if(!inLab()) return coreAttackFx?.emit?.(source,target,kind,amount,face);
    const from=cardCenter(source),to=cardCenter(target);
    if(!from||!to) return null;
    const style=String(players?.[Number(source)]?.attackFx||selectedLabFx()||'classic');
    const fx={
      id:`labfx-${Date.now()}-${Math.random()}`,
      style,from,to,start:performance.now(),
      duration:style==='lightning'?430:style==='blood'?480:style==='crown'?850:700,
      seed:Math.random()*999
    };
    activeLabFx.push(fx);
    return {id:fx.id,source,target,style,kind,amount,face,at:Date.now()};
  }

  // Wrap the existing engine. Outside the Test Lab, absolutely nothing changes.
  const coreAttackFx=window.WDAttackFx;
  if(coreAttackFx){
    window.WDAttackFx={
      emit(source,target,kind,amount,face){
        return inLab()?labEmit(source,target,kind,amount,face):coreAttackFx.emit(source,target,kind,amount,face);
      },
      play(event){
        if(!inLab()) return coreAttackFx.play(event);
        const from=cardCenter(event?.source),to=cardCenter(event?.target);
        if(!from||!to) return false;
        const style=String(event?.style||players?.[Number(event?.source)]?.attackFx||'classic');
        activeLabFx.push({id:event?.id||`labplay-${Date.now()}`,style,from,to,start:performance.now(),duration:700,seed:Math.random()*999});
        return true;
      },
      getLastPlayedId:()=>coreAttackFx.getLastPlayedId?.(),
      reset(){activeLabFx=[];coreAttackFx.reset?.();}
    };
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
    fxCtx.save();
    fxCtx.lineCap='round';
    fxCtx.beginPath();
    fxCtx.moveTo(from.x,from.y);
    fxCtx.quadraticCurveTo(mx,my,lerp(from.x,to.x,p),lerp(from.y,to.y,p)-Math.sin(p*Math.PI)*42);
    fxCtx.strokeStyle=c2;fxCtx.lineWidth=7;fxCtx.globalAlpha=.18;fxCtx.stroke();
    fxCtx.strokeStyle=c1;fxCtx.lineWidth=2.2;fxCtx.globalAlpha=.92;fxCtx.stroke();
    const qx=lerp(from.x,to.x,p),qy=lerp(from.y,to.y,p)-Math.sin(p*Math.PI)*42;
    glowCircle(fxCtx,qx,qy,13,c1,.55);
    fxCtx.restore();
  }

  function drawLightning(fx,t){
    if(t>.72) return;
    const [c1,c2]=labFxColor('lightning');
    const {from,to}=fx;
    const dx=to.x-from.x,dy=to.y-from.y,len=Math.max(1,Math.hypot(dx,dy));
    const nx=-dy/len,ny=dx/len;
    fxCtx.save();fxCtx.lineCap='round';fxCtx.lineJoin='round';
    for(let pass=0;pass<2;pass++){
      fxCtx.beginPath();fxCtx.moveTo(from.x,from.y);
      const steps=10;
      for(let k=1;k<=steps;k++){
        const q=k/steps;
        const edge=k===steps;
        const jitter=edge?0:Math.sin((k+fx.seed)*8.31)*(6+(k%3)*3);
        fxCtx.lineTo(from.x+dx*q+nx*jitter,from.y+dy*q+ny*jitter);
      }
      fxCtx.strokeStyle=pass?c1:c2;fxCtx.lineWidth=pass?2.2:8;fxCtx.globalAlpha=pass?.95:.2;fxCtx.stroke();
    }
    glowCircle(fxCtx,to.x,to.y,32,c1,Math.max(0,.65-t*.5));
    fxCtx.restore();
  }

  function drawHellfire(fx,t){
    const [c1,c2]=labFxColor('flame');
    const p=easeInOut(Math.min(1,t*1.12));
    const pos=pointOn(fx.from,fx.to,p);
    const dx=fx.to.x-fx.from.x,dy=fx.to.y-fx.from.y;
    const len=Math.max(1,Math.hypot(dx,dy)),ux=dx/len,uy=dy/len;
    const nx=-uy,ny=ux;
    const ang=Math.atan2(dy,dx);

    fxCtx.save();
    fxCtx.globalCompositeOperation='lighter';

    // living flame trail: several tapering tongues, not circles
    for(let k=0;k<8;k++){
      const back=(k+1)*12;
      const sway=Math.sin(t*18+k*1.7)*5*(1-k/10);
      const x=pos.x-ux*back+nx*sway;
      const y=pos.y-uy*back+ny*sway;
      const h=20-k*1.7;
      const w=7-k*.45;

      const g=fxCtx.createLinearGradient(x,y,x-ux*h,y-uy*h);
      g.addColorStop(0,`rgba(255,80,90,${.34*(1-k/9)})`);
      g.addColorStop(.45,`rgba(235,10,36,${.28*(1-k/9)})`);
      g.addColorStop(1,'rgba(90,0,18,0)');

      fxCtx.save();
      fxCtx.translate(x,y);
      fxCtx.rotate(ang+Math.PI);
      fxCtx.fillStyle=g;
      fxCtx.beginPath();
      fxCtx.moveTo(-w,0);
      fxCtx.bezierCurveTo(-w*1.2,-h*.25,-w*.45,-h*.55,0,-h);
      fxCtx.bezierCurveTo(w*.45,-h*.58,w*1.1,-h*.26,w,0);
      fxCtx.closePath();
      fxCtx.fill();
      fxCtx.restore();
    }

    // flaming core projectile
    glowCircle(fxCtx,pos.x,pos.y,18,c1,.66);
    fxCtx.save();
    fxCtx.translate(pos.x,pos.y);
    fxCtx.rotate(ang);
    fxCtx.fillStyle=c1;
    fxCtx.globalAlpha=.92;
    fxCtx.beginPath();
    fxCtx.moveTo(18,0);
    fxCtx.bezierCurveTo(6,-8,-7,-8,-17,-2);
    fxCtx.bezierCurveTo(-10,0,-7,7,3,7);
    fxCtx.bezierCurveTo(10,6,14,3,18,0);
    fxCtx.fill();
    fxCtx.restore();

    fxCtx.restore();

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

    fxCtx.save();
    fxCtx.globalCompositeOperation='lighter';

    // poison trail hanging behind the projectile
    for(let k=0;k<10;k++){
      const back=(k+1)*13;
      const lateral=Math.sin(k*1.8+fx.seed)*5;
      const x=pos.x-ux*back+nx*lateral;
      const y=pos.y-uy*back+ny*lateral + k*.9;
      const a=Math.max(0,.24-k*.018);
      glowCircle(fxCtx,x,y,7-k*.22,c1,a);

      // droplet tail downward
      fxCtx.fillStyle=`rgba(70,220,90,${a*.8})`;
      fxCtx.beginPath();
      fxCtx.ellipse(x,y+4,2.2,5.5,0,0,Math.PI*2);
      fxCtx.fill();
    }

    glowCircle(fxCtx,pos.x,pos.y,15,c1,.58);
    fxCtx.fillStyle=c2;
    fxCtx.globalAlpha=.88;
    fxCtx.beginPath();
    fxCtx.ellipse(pos.x,pos.y,9,12,Math.sin(t*8)*.18,0,Math.PI*2);
    fxCtx.fill();

    // glossy toxic center
    fxCtx.fillStyle='rgba(220,255,210,.35)';
    fxCtx.beginPath();
    fxCtx.ellipse(pos.x-2.5,pos.y-3.5,3,4,0,0,Math.PI*2);
    fxCtx.fill();
    fxCtx.restore();

    if(t>.66){
      const e=(t-.66)/.34;
      impactFlash(fx.to.x,fx.to.y,c1,e,38,.3);
      impactRing(fx.to.x,fx.to.y,c2,e,38,2.2,.48);
      for(let k=0;k<8;k++){
        const a=k*Math.PI*2/8+fx.seed;
        const d=e*(20+(k%3)*8);
        glowCircle(fxCtx,fx.to.x+Math.cos(a)*d,fx.to.y+Math.sin(a)*d,6,c1,(1-e)*.26);
      }
    }
  }
  function drawBloodSlash(fx,t){
    const [c1,c2]=labFxColor('blood');
    if(t<.18) return;
    const e=Math.min(1,(t-.18)/.48);
    const fade=1-Math.max(0,(t-.72)/.28);
    const cx=fx.to.x,cy=fx.to.y;

    fxCtx.save();
    fxCtx.translate(cx,cy);
    fxCtx.rotate(-.68);
    fxCtx.lineCap='round';
    fxCtx.lineJoin='round';

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

      fxCtx.beginPath();
      fxCtx.moveTo(x0,y0);
      fxCtx.bezierCurveTo(-35,mid1,12,mid2,x1,sc.off+Math.sin(sc.phase+1.8)*4);

      fxCtx.strokeStyle=c2;
      fxCtx.lineWidth=10;
      fxCtx.globalAlpha=.16*fade;
      fxCtx.stroke();

      fxCtx.strokeStyle=c1;
      fxCtx.lineWidth=2.5;
      fxCtx.globalAlpha=.94*fade;
      fxCtx.stroke();
    });

    fxCtx.restore();

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

    fxCtx.save();
    fxCtx.font='bold 24px system-ui';
    fxCtx.textAlign='center';
    fxCtx.textBaseline='middle';
    fxCtx.fillStyle=c1;
    fxCtx.globalAlpha=.9;
    fxCtx.translate(pos.x,pos.y);
    fxCtx.rotate(t*9);
    fxCtx.fillText(suits[Math.floor(fx.seed)%4],0,0);
    fxCtx.restore();

    if(t>.55){
      const e=(t-.55)/.45;
      fxCtx.font='bold 22px system-ui';
      fxCtx.textAlign='center';
      for(let k=0;k<12;k++){
        const a=k*Math.PI*2/12 + (k%2)*.12;
        const d=e*(38+(k%4)*13);
        fxCtx.fillStyle=k%2?c1:c2;
        fxCtx.globalAlpha=(1-e)*.95;
        fxCtx.fillText(suits[k%4],fx.to.x+Math.cos(a)*d,fx.to.y+Math.sin(a)*d);
      }
      fxCtx.globalAlpha=1;
      impactFlash(fx.to.x,fx.to.y,c1,e,58,.42);
      impactRing(fx.to.x,fx.to.y,c1,e,70,2.4,.72);
      impactSparks(fx.to.x,fx.to.y,c2,e,14,68);
    }
  }
  function drawVoid(fx,t){
    const [c1,c2]=labFxColor('void');
    const p=easeInOut(Math.min(1,t/.62));
    const pos=pointOn(fx.from,fx.to,p);
    glowCircle(fxCtx,pos.x,pos.y,22,c2,.62);

    if(t>.38){
      const e=Math.min(1,(t-.38)/.62);
      fxCtx.save();
      fxCtx.translate(fx.to.x,fx.to.y);

      // large rotating elliptical tear
      fxCtx.strokeStyle=c1;
      fxCtx.globalAlpha=(1-e)*.95;
      fxCtx.lineWidth=3.2;
      fxCtx.beginPath();
      fxCtx.ellipse(0,0,14+e*54,30+e*22,e*2.8,0,Math.PI*2);
      fxCtx.stroke();

      fxCtx.strokeStyle=c2;
      fxCtx.lineWidth=10;
      fxCtx.globalAlpha=(1-e)*.14;
      fxCtx.stroke();

      // inner collapsing ring
      fxCtx.strokeStyle=c2;
      fxCtx.lineWidth=1.8;
      fxCtx.globalAlpha=(1-e)*.55;
      fxCtx.beginPath();
      fxCtx.ellipse(0,0,8+e*26,18+e*12,-e*2.1,0,Math.PI*2);
      fxCtx.stroke();

      fxCtx.restore();

      impactFlash(fx.to.x,fx.to.y,c1,e,62,.34);
      impactRing(fx.to.x,fx.to.y,c2,e,76,2.6,.66);
    }
  }
  function drawConfetti(fx,t){
    const p=easeOutCubic(Math.min(1,t/.48));
    const pos=pointOn(fx.from,fx.to,p);
    const cols=['#ff78d7','#6de8ff','#ffe46f','#8cff78'];

    // moving party capsule, no white guide line
    fxCtx.save();
    fxCtx.translate(pos.x,pos.y);
    fxCtx.rotate(t*10);
    fxCtx.fillStyle=cols[Math.floor(fx.seed)%cols.length];
    fxCtx.globalAlpha=.9;
    fxCtx.fillRect(-7,-4,14,8);
    fxCtx.fillStyle='#ffffff';
    fxCtx.globalAlpha=.35;
    fxCtx.fillRect(-2,-4,4,8);
    fxCtx.restore();

    if(t>.45){
      const e=(t-.45)/.55;
      for(let k=0;k<20;k++){
        const a=k*.79+fx.seed;
        const d=e*(34+(k%6)*10);
        fxCtx.save();
        fxCtx.translate(
          fx.to.x+Math.cos(a)*d,
          fx.to.y+Math.sin(a)*d+e*e*38
        );
        fxCtx.rotate(a+e*8);
        fxCtx.globalAlpha=(1-e)*.96;
        fxCtx.fillStyle=cols[k%cols.length];
        fxCtx.fillRect(-3,-6,6,12);
        fxCtx.restore();
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

    fxCtx.save();
    fxCtx.translate(pos.x,pos.y);
    fxCtx.rotate(ang);

    // long spear body
    const spearLen=46;
    const shaft=fxCtx.createLinearGradient(-spearLen,0,16,0);
    shaft.addColorStop(0,'rgba(80,190,240,0)');
    shaft.addColorStop(.25,'rgba(120,220,255,.55)');
    shaft.addColorStop(.72,'rgba(220,255,255,.9)');
    shaft.addColorStop(1,'rgba(255,255,255,.98)');
    fxCtx.fillStyle=shaft;
    fxCtx.globalAlpha=.95;
    fxCtx.beginPath();
    fxCtx.moveTo(20,0);
    fxCtx.lineTo(2,-7);
    fxCtx.lineTo(-34,-4);
    fxCtx.lineTo(-44,0);
    fxCtx.lineTo(-34,4);
    fxCtx.lineTo(2,7);
    fxCtx.closePath();
    fxCtx.fill();

    // crystalline ridge
    fxCtx.strokeStyle=c2;
    fxCtx.lineWidth=1.5;
    fxCtx.globalAlpha=.7;
    fxCtx.beginPath();
    fxCtx.moveTo(-30,0);
    fxCtx.lineTo(8,0);
    fxCtx.stroke();

    fxCtx.restore();

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
    fxCtx.save();fxCtx.translate(fx.to.x,fx.to.y);
    fxCtx.strokeStyle=c1;fxCtx.lineWidth=3;fxCtx.globalAlpha=Math.max(0,1-Math.max(0,t-.72)/.28);
    fxCtx.beginPath();fxCtx.moveTo(0,-e*48);
    for(let k=1;k<=7;k++){
      const y=-48*e+k*(96*e/7),x=Math.sin(k*2.8+fx.seed)*8;
      fxCtx.lineTo(x,y);
    }
    fxCtx.stroke();
    fxCtx.strokeStyle=c2;fxCtx.lineWidth=8;fxCtx.globalAlpha=.12;fxCtx.stroke();
    fxCtx.restore();
  }

  function drawCrownfall(fx,t){
    const [c1,c2]=labFxColor('crown');
    const e=easeOutCubic(Math.min(1,t/.7));
    const y=lerp(fx.to.y-100,fx.to.y-12,e);
    fxCtx.save();fxCtx.font='bold 34px system-ui';fxCtx.textAlign='center';fxCtx.textBaseline='middle';
    fxCtx.fillStyle=c1;fxCtx.shadowColor=c2;fxCtx.shadowBlur=16;fxCtx.globalAlpha=.95;fxCtx.fillText('♛',fx.to.x,y);fxCtx.restore();
    if(t>.58){
      const q=(t-.58)/.42;
      fxCtx.strokeStyle=c1;fxCtx.lineWidth=3;fxCtx.globalAlpha=(1-q)*.8;
      fxCtx.beginPath();fxCtx.arc(fx.to.x,fx.to.y,8+q*58,0,Math.PI*2);fxCtx.stroke();
      fxCtx.globalAlpha=1;
    }
  }


  function impactRing(x,y,color,e,maxR=52,width=2.4,alpha=.75){
    if(e<=0||e>=1) return;
    fxCtx.save();
    fxCtx.globalAlpha=(1-e)*alpha;
    fxCtx.strokeStyle=color;
    fxCtx.lineWidth=width*(1-e*.35);
    fxCtx.beginPath();
    fxCtx.arc(x,y,5+e*maxR,0,Math.PI*2);
    fxCtx.stroke();
    fxCtx.restore();
  }

  function impactFlash(x,y,color,e,size=44,alpha=.32){
    if(e<=0||e>=1) return;
    glowCircle(fxCtx,x,y,size*(.42+e*.7),color,(1-e)*alpha);
  }

  function impactSparks(x,y,color,e,count=8,spread=48){
    if(e<=0||e>=1) return;
    fxCtx.save();
    fxCtx.lineCap='round';
    for(let k=0;k<count;k++){
      const a=(Math.PI*2/count)*k + .15*Math.sin(k*5.1);
      const d=e*spread*(.72+(k%3)*.11);
      fxCtx.strokeStyle=color;
      fxCtx.globalAlpha=(1-e)*(.82-(k%2)*.14);
      fxCtx.lineWidth=k%3===0?2.3:1.35;
      fxCtx.beginPath();
      fxCtx.moveTo(x+Math.cos(a)*d*.28,y+Math.sin(a)*d*.28);
      fxCtx.lineTo(x+Math.cos(a)*d,y+Math.sin(a)*d);
      fxCtx.stroke();
    }
    fxCtx.restore();
  }

  function impactShards(x,y,color,e,count=8,spread=44){
    if(e<=0||e>=1) return;
    fxCtx.save();
    for(let k=0;k<count;k++){
      const a=(Math.PI*2/count)*k+.23;
      const d=e*spread*(.72+(k%2)*.16);
      const px=x+Math.cos(a)*d;
      const py=y+Math.sin(a)*d;
      fxCtx.save();
      fxCtx.translate(px,py);
      fxCtx.rotate(a+e*2.4);
      fxCtx.globalAlpha=(1-e)*.74;
      fxCtx.fillStyle=color;
      fxCtx.beginPath();
      fxCtx.moveTo(0,-5.5);fxCtx.lineTo(2.5,4.5);fxCtx.lineTo(-2.5,4.5);fxCtx.closePath();
      fxCtx.fill();
      fxCtx.restore();
    }
    fxCtx.restore();
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
          glowCircle(fxCtx,x+Math.cos(a)*d,y+Math.sin(a)*d,5.5,c1,(1-e)*.24);
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

  function fxFrame(now){
    resizeFxCanvases();
    fxCtx.clearRect(0,0,window.innerWidth,window.innerHeight);
    activeLabFx=activeLabFx.filter(fx=>drawLabFx(fx,now));
    fxLast=now;
    requestAnimationFrame(fxFrame);
  }
  requestAnimationFrame(fxFrame);

  // -----------------------------
  // Hot Dice: translucent tapered flames, not bubble spam
  // -----------------------------
  function flameLevel(){
    if(!inLab()||current!==0) return 0;
    return hotDemoLevel||Number(players?.[0]?.hotDiceStreak)||0;
  }

  function spawnFlameForDie(r,level){
    const center=r.left+r.width*(.2+Math.random()*.6);
    const baseY=r.bottom-r.height*(.04+Math.random()*.12);
    const strength=level>=5?1.22:level>=4?1.05:.9;
    fireParticles.push({
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

  function spawnFire(dt,level){
    const dice=[...document.querySelectorAll('#dice .die')].filter(el=>el.offsetParent!==null);
    if(!dice.length||level<3) return;
    // particles / second / die — intentionally restrained so dice stay readable
    const pps=level>=5?6.5:level>=4?4.8:3.4;
    const chance=Math.min(.35,(dt/1000)*pps);
    for(const die of dice){
      const r=die.getBoundingClientRect();
      if(Math.random()<chance) spawnFlameForDie(r,level);
      if(level>=5&&Math.random()<chance*.22) spawnFlameForDie(r,level);
    }
    if(fireParticles.length>85) fireParticles.splice(0,fireParticles.length-85);
  }

  function drawFlame(p){
    const t=p.life/p.ttl;
    const fade=Math.sin(Math.min(1,t)*Math.PI);
    const sway=Math.sin(p.phase+p.life*8.1)*p.sway*(.10+t*.50);
    const bend=Math.sin(p.phase*.8+p.life*4.7)*p.width*.85;
    const x=p.x+sway;
    const y=p.y;
    const h=p.height*(.72+t*.74);
    const w=p.width*(1-t*.34);

    fireCtx.save();
    fireCtx.translate(x,y);
    fireCtx.globalCompositeOperation='lighter';

    const outer=fireCtx.createLinearGradient(0,4,0,-h);
    outer.addColorStop(0,'rgba(90,0,14,0)');
    outer.addColorStop(.10,`rgba(125,0,18,${.12*fade})`);
    outer.addColorStop(.32,`rgba(210,5,31,${.24*fade})`);
    outer.addColorStop(.56,`rgba(255,38,58,${.29*fade})`);
    outer.addColorStop(.76,`rgba(255,105,118,${.20*fade})`);
    outer.addColorStop(.91,`rgba(255,195,200,${.08*fade})`);
    outer.addColorStop(1,'rgba(255,225,228,0)');
    fireCtx.fillStyle=outer;

    // Main flame: rounded shoulder, curved asymmetric tip.
    fireCtx.beginPath();
    fireCtx.moveTo(-w*.9,2);
    fireCtx.bezierCurveTo(-w*1.12,-h*.16,-w*.72,-h*.40,-w*.34,-h*.57);
    fireCtx.bezierCurveTo(-w*.05,-h*.70,bend*.15,-h*.84,bend,-h);
    fireCtx.bezierCurveTo(w*.28,-h*.82,w*.78,-h*.57,w*.96,-h*.30);
    fireCtx.bezierCurveTo(w*1.10,-h*.10,w*.72,1,w*.20,3);
    fireCtx.bezierCurveTo(-w*.16,4,-w*.60,4,-w*.9,2);
    fireCtx.fill();

    // Curved side lick. Gives a real flame silhouette instead of a triangle.
    const side=Math.sin(p.phase)>0?1:-1;
    const sh=h*(.43+.10*Math.sin(p.phase*1.6));
    fireCtx.globalAlpha=.68;
    fireCtx.beginPath();
    fireCtx.moveTo(side*w*.15,1);
    fireCtx.bezierCurveTo(side*w*.42,-sh*.16,side*w*.74,-sh*.40,side*w*.58,-sh*.62);
    fireCtx.bezierCurveTo(side*w*.44,-sh*.78,side*w*.18,-sh*.90,side*w*.03,-sh);
    fireCtx.bezierCurveTo(side*(-w*.06),-sh*.66,side*(-w*.01),-sh*.22,side*w*.15,1);
    fireCtx.fill();

    // Soft inner tongue — transparent, never blocking the die.
    if(p.level>=4){
      const inner=fireCtx.createLinearGradient(0,0,0,-h*.68);
      inner.addColorStop(0,'rgba(255,55,72,0)');
      inner.addColorStop(.34,`rgba(255,82,98,${.08*fade})`);
      inner.addColorStop(.62,`rgba(255,150,158,${.10*fade})`);
      inner.addColorStop(1,'rgba(255,228,230,0)');
      fireCtx.globalAlpha=.86;
      fireCtx.fillStyle=inner;
      fireCtx.beginPath();
      fireCtx.moveTo(-w*.23,0);
      fireCtx.bezierCurveTo(-w*.18,-h*.18,-w*.06,-h*.38,bend*.10,-h*.62);
      fireCtx.bezierCurveTo(w*.16,-h*.39,w*.27,-h*.18,w*.23,0);
      fireCtx.closePath();
      fireCtx.fill();
    }
    fireCtx.restore();
  }

  function fireFrame(now){
    resizeFxCanvases();
    const dt=Math.min(34,now-fireLast);fireLast=now;
    const level=flameLevel();
    fireCanvas.classList.toggle('active',level>=3);
    if(level>=3) spawnFire(dt,level);

    fireCtx.clearRect(0,0,window.innerWidth,window.innerHeight);
    const sec=dt/1000;
    fireParticles=fireParticles.filter(p=>{
      p.life+=sec;
      if(p.life>=p.ttl) return false;
      p.x+=p.vx*sec;
      p.y+=p.vy*sec;
      p.vx*=.992;
      drawFlame(p);
      return true;
    });
    requestAnimationFrame(fireFrame);
  }
  requestAnimationFrame(fireFrame);

  const observer=new MutationObserver(()=>{if(inLab()) requestAnimationFrame(applyWorkbench);});
  const game=$lab('game');
  if(game) observer.observe(game,{childList:true,subtree:true});

  document.querySelectorAll('#menuPlayBtn,#menuCampaignBtn,#menuProfilesBtn,#menuAchievementsBtn,#menuStatsBtn,#menuSettingsBtn,#menuRulesBtn,#menuChangelogBtn,.menuBackBtn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.body.classList.remove('test-lab-active');
      document.getElementById('testLabWorkbench')?.remove();
      hotDemoLevel=0;fireParticles=[];activeLabFx=[];
    });
  });
})();
