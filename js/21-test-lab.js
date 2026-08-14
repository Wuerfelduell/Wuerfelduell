
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
      window.WDAttackFx?.emit?.(0,1,'laser',6,6);
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

  // -----------------------------
  // Smooth Hot Dice fire renderer
  // -----------------------------
  const canvas=document.createElement('canvas');
  canvas.id='testLabFireCanvas';
  canvas.setAttribute('aria-hidden','true');
  document.body.appendChild(canvas);
  const ctx=canvas.getContext('2d',{alpha:true});
  let particles=[];
  let last=performance.now();
  let dpr=1;

  function resizeCanvas(){
    dpr=Math.min(window.devicePixelRatio||1,2);
    const w=window.innerWidth,h=window.innerHeight;
    if(canvas.width!==Math.round(w*dpr)||canvas.height!==Math.round(h*dpr)){
      canvas.width=Math.round(w*dpr);canvas.height=Math.round(h*dpr);
      canvas.style.width=`${w}px`;canvas.style.height=`${h}px`;
      ctx.setTransform(dpr,0,0,dpr,0,0);
    }
  }

  function flameLevel(){
    if(!inLab()||current!==0) return 0;
    return hotDemoLevel||Number(players?.[0]?.hotDiceStreak)||0;
  }

  function spawnFire(dt,level){
    const dice=[...document.querySelectorAll('#dice .die')].filter(el=>el.offsetParent!==null);
    if(!dice.length||level<3) return;
    const rate=level>=5?0.22:level>=4?0.14:0.09;
    const count=Math.min(10,Math.floor(dt*rate));
    for(const die of dice){
      const r=die.getBoundingClientRect();
      for(let i=0;i<count;i++){
        const edgeBias=Math.random();
        const x=r.left+r.width*(0.08+Math.random()*.84);
        const y=r.bottom-r.height*(.04+Math.random()*.24);
        particles.push({
          x,y,
          vx:(Math.random()-.5)*(level>=5?32:22),
          vy:-(42+Math.random()*(level>=5?100:68)),
          life:0,
          ttl:.48+Math.random()*(level>=5?.72:.48),
          size:3+Math.random()*(level>=5?9:6),
          drift:(Math.random()-.5)*2.4,
          level
        });
      }
    }
    if(particles.length>420) particles.splice(0,particles.length-420);
  }

  function drawParticle(p){
    const t=p.life/p.ttl;
    const alpha=Math.max(0,1-t);
    const swell=1+Math.sin(Math.min(1,t)*Math.PI)*.65;
    const radius=p.size*swell*(1-t*.45);
    const g=ctx.createRadialGradient(p.x,p.y,0,p.x,p.y,radius*2.2);
    // Deliberately red/crimson, almost no yellow.
    if(p.level>=5){
      g.addColorStop(0,`rgba(255,235,235,${alpha*.92})`);
      g.addColorStop(.13,`rgba(255,55,70,${alpha*.95})`);
      g.addColorStop(.48,`rgba(205,0,25,${alpha*.72})`);
      g.addColorStop(1,'rgba(70,0,12,0)');
    }else{
      g.addColorStop(0,`rgba(255,95,105,${alpha*.85})`);
      g.addColorStop(.25,`rgba(235,20,42,${alpha*.88})`);
      g.addColorStop(.62,`rgba(145,0,18,${alpha*.56})`);
      g.addColorStop(1,'rgba(50,0,8,0)');
    }
    ctx.fillStyle=g;
    ctx.beginPath();
    ctx.ellipse(p.x,p.y,radius*.8,radius*1.65,0,0,Math.PI*2);
    ctx.fill();
  }

  function fireFrame(now){
    resizeCanvas();
    const dt=Math.min(34,now-last);last=now;
    const level=flameLevel();
    canvas.classList.toggle('active',level>=3);
    if(level>=3) spawnFire(dt,level);

    ctx.clearRect(0,0,window.innerWidth,window.innerHeight);
    const sec=dt/1000;
    particles=particles.filter(p=>{
      p.life+=sec;
      if(p.life>=p.ttl) return false;
      p.vx+=Math.sin(p.life*12+p.drift)*7*sec;
      p.vy-=18*sec;
      p.x+=p.vx*sec;p.y+=p.vy*sec;
      drawParticle(p);
      return true;
    });
    requestAnimationFrame(fireFrame);
  }
  requestAnimationFrame(fireFrame);

  // renderAll can recreate player cards/dice; reapply Lab-only cosmetics after mutations.
  const observer=new MutationObserver(()=>{if(inLab()) requestAnimationFrame(applyWorkbench);});
  const game=$lab('game');
  if(game) observer.observe(game,{childList:true,subtree:true});

  document.querySelectorAll('#menuPlayBtn,#menuCampaignBtn,#menuProfilesBtn,#menuAchievementsBtn,#menuStatsBtn,#menuSettingsBtn,#menuRulesBtn,#menuChangelogBtn,.menuBackBtn').forEach(btn=>{
    btn.addEventListener('click',()=>{
      document.body.classList.remove('test-lab-active');
      document.getElementById('testLabWorkbench')?.remove();
      hotDemoLevel=0;particles=[];
    });
  });
})();
