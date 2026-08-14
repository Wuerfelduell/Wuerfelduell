(() => {
  const $lab = id => document.getElementById(id);
  const hub=$lab('tutorialHubModal');
  const picker=$lab('testLabAbilityModal');
  const grid=$lab('testLabAbilityGrid');
  const counter=$lab('testLabAbilityCounter');
  const startBtn=$lab('testLabStartBtn');
  const selected=[];

  if(!hub || !picker || !grid || !startBtn) return;

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
      btn.onclick=()=>{
        const at=selected.indexOf(id);
        if(at>=0) selected.splice(at,1);
        else if(selected.length<2) selected.push(id);
        else return;
        [...grid.children].forEach((el,i)=>el.classList.toggle('selected',selected.includes(ids[i])));
        counter.textContent=`${selected.length} / 2 gewählt`;
        startBtn.disabled=selected.length!==2;
      };
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

  function startTestLab(){
    if(selected.length!==2) return;
    closePicker();

    // Reuse the stable tutorial battle bootstrap, then turn all tutorial behavior off.
    startTutorial();
    resetTutorialUi();
    tutorialMode=false;
    campaignMode=false;
    if(typeof duoCampaignMode!=='undefined') duoCampaignMode=false;
    if(typeof trioCampaignMode!=='undefined') trioCampaignMode=false;
    gameContext={mode:'test-lab',returnScreen:'menu',profileId:null,encounterId:null};
    document.body.classList.add('test-lab-active');

    const human=players[0];
    Object.assign(human,{
      name:'Du',profileId:null,botLevel:'human',hp:25,maxHp:25,
      ability:selected[0],secondAbility:selected[1],thirdAbility:null,
      secondAbilityUnlocked:true,thirdAbilityUnlocked:false,
      rolledAbility:'TEST',primaryWasChosen:true,secondAbilityWasChosen:true,thirdAbilityWasChosen:false
    });
    const bot=players[1];
    Object.assign(bot,{
      name:'Test-Bot',profileId:null,botLevel:'easy',hp:100,maxHp:100,
      ability:0,secondAbility:null,thirdAbility:null,
      secondAbilityUnlocked:false,thirdAbilityUnlocked:false,
      rolledAbility:'TEST',primaryWasChosen:false,secondAbilityWasChosen:false,thirdAbilityWasChosen:false
    });

    // startTutorial initialized the round before abilities/HP were replaced; refresh runtime/UI once.
    resetRoundStats();
    prepareBloodRushForTurn(current);
    addLog(`🧪 Testumgebung: ${ABILITIES[selected[0]].name} + ${ABILITIES[selected[1]].name} · Test-Bot 100 HP · nur 5er/6er Würfel · kein Save.`);
    renderAll();
  }

  // Intercept the old direct Tutorial launch after 15-app has registered its handler.
  const menuTutorial=$lab('menuTutorialBtn');
  if(menuTutorial) menuTutorial.onclick=openHub;
  $lab('tutorialHubStartBtn').onclick=()=>{closeHub();document.body.classList.remove('test-lab-active');startTutorial();};
  $lab('tutorialHubLabBtn').onclick=openPicker;
  $lab('tutorialHubCancelBtn').onclick=closeHub;
  $lab('testLabBackBtn').onclick=()=>{closePicker();openHub();};
  startBtn.onclick=startTestLab;

  // Test dice: all dice rolls are exactly 5 or 6, for player AND bot.
  if(typeof randDieForPlayer==='function'){
    const normalRandDieForPlayer=randDieForPlayer;
    randDieForPlayer=function(index){
      if(gameContext?.mode==='test-lab') return Math.random()<0.5?5:6;
      return normalRandDieForPlayer(index);
    };
  }

  // Clean lab marker when any normal front-screen navigation happens.
  document.querySelectorAll('#menuPlayBtn,#menuCampaignBtn,#menuProfilesBtn,#menuAchievementsBtn,#menuStatsBtn,#menuSettingsBtn,#menuRulesBtn,#menuChangelogBtn,.menuBackBtn').forEach(btn=>{
    btn.addEventListener('click',()=>document.body.classList.remove('test-lab-active'));
  });
})();
