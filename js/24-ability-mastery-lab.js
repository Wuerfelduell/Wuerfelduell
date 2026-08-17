(() => {
  const modal=document.getElementById('abilityMasteryLabModal');
  const tree=document.getElementById('abilityMasteryLabTree');
  const closeBtn=document.getElementById('abilityMasteryLabClose');
  if(!modal||!tree||!closeBtn) return;

  const pairs=[
    {left:1,right:2,fusion:12,tone:'crimson'},
    {left:3,right:4,fusion:34,tone:'violet'},
    {left:5,right:6,fusion:56,tone:'cyan'}
  ];

  function branchNode(number,level,side,tone){
    const cost=level===1?300:500;
    return `
      <button type="button"
        class="aml-node aml-ability-node aml-${side} aml-${tone}"
        data-node-type="ability"
        data-ability="${number}"
        data-level="${level}"
        data-cost="${cost}">
        <span class="aml-node-orbit"></span>
        <span class="aml-node-core">
          <span class="aml-node-number">${number}</span>
          <small>L${level}</small>
        </span>
        <span class="aml-node-tag">
          <strong>${cost}</strong>
          <span>XP</span>
        </span>
      </button>`;
  }

  function fusionNode(number,tone,left,right){
    return `
      <button type="button"
        class="aml-node aml-fusion-node aml-${tone}"
        data-node-type="fusion"
        data-fusion="${number}"
        data-left="${left}"
        data-right="${right}"
        data-cost="1000">
        <span class="aml-fusion-halo halo-a"></span>
        <span class="aml-fusion-halo halo-b"></span>
        <span class="aml-fusion-core">
          <small>FUSION</small>
          <strong>${number}</strong>
          <span>1000 XP</span>
        </span>
      </button>`;
  }

  function pairMarkup(pair,index){
    return `
      <section class="aml-pair aml-pair-${pair.tone}" data-pair="${index}">
        <div class="aml-branch-headings">
          <div class="aml-ability-heading">
            <small>ABILITY BRANCH</small>
            <strong>Fähigkeit ${pair.left}</strong>
          </div>
          <div class="aml-pair-emblem">
            <span>${String(pair.left).padStart(2,'0')}</span>
            <i>×</i>
            <span>${String(pair.right).padStart(2,'0')}</span>
          </div>
          <div class="aml-ability-heading aml-ability-heading-right">
            <small>ABILITY BRANCH</small>
            <strong>Fähigkeit ${pair.right}</strong>
          </div>
        </div>

        <svg class="aml-links" viewBox="0 0 600 470" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="grad-${index}-l" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="rgba(255,255,255,.08)"/>
              <stop offset=".56" stop-color="var(--aml-accent)"/>
              <stop offset="1" stop-color="var(--aml-accent2)"/>
            </linearGradient>
            <linearGradient id="grad-${index}-r" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="rgba(255,255,255,.08)"/>
              <stop offset=".56" stop-color="var(--aml-accent)"/>
              <stop offset="1" stop-color="var(--aml-accent2)"/>
            </linearGradient>
            <filter id="glow-${index}">
              <feGaussianBlur stdDeviation="4" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path class="aml-link aml-link-dim" d="M125 120 C125 170 125 210 155 255"/>
          <path class="aml-link aml-link-dim" d="M475 120 C475 170 475 210 445 255"/>
          <path class="aml-link aml-link-hot" filter="url(#glow-${index})" stroke="url(#grad-${index}-l)" d="M155 255 C195 330 235 360 300 410"/>
          <path class="aml-link aml-link-hot" filter="url(#glow-${index})" stroke="url(#grad-${index}-r)" d="M445 255 C405 330 365 360 300 410"/>
        </svg>

        <div class="aml-branch aml-branch-left">
          ${branchNode(pair.left,1,'left',pair.tone)}
          ${branchNode(pair.left,2,'left',pair.tone)}
        </div>

        <div class="aml-branch aml-branch-right">
          ${branchNode(pair.right,1,'right',pair.tone)}
          ${branchNode(pair.right,2,'right',pair.tone)}
        </div>

        ${fusionNode(pair.fusion,pair.tone,pair.left,pair.right)}
      </section>`;
  }

  function render(){
    tree.innerHTML=`
      <div class="aml-tree-intro">
        <div>
          <small>ABILITY BRANCHES</small>
          <strong>L1 → L2 → Fusion</strong>
        </div>
        <div class="aml-tree-chip">6 Äste · 3 Fusionen</div>
      </div>
      ${pairs.map(pairMarkup).join('')}
      <div class="aml-future-node">
        <span>?</span>
        <div><strong>WEITERE FUSIONEN</strong><small>Platzhalter für spätere Cross-Links</small></div>
      </div>
    `;
    bindNodePopups();
  }

  function ensureInfoPopup(){
    let popup=document.getElementById('abilityMasteryLabInfo');
    if(popup) return popup;

    popup=document.createElement('div');
    popup.id='abilityMasteryLabInfo';
    popup.className='aml-info-popup hidden';
    popup.innerHTML=`
      <div class="aml-info-card">
        <button type="button" class="aml-info-close">✕</button>
        <div class="aml-info-kicker">UPGRADEBESCHREIBUNG</div>
        <div class="aml-info-title"></div>
        <div class="aml-info-cost"></div>
        <div class="aml-info-desc"></div>
        <div class="aml-info-note">Nur visueller Platzhalter · noch keine echte Fähigkeit hinterlegt.</div>
      </div>
    `;
    modal.appendChild(popup);

    popup.querySelector('.aml-info-close').addEventListener('click',()=>popup.classList.add('hidden'));
    popup.addEventListener('click',e=>{
      if(e.target===popup) popup.classList.add('hidden');
    });
    return popup;
  }

  function openNodeInfo(button){
    const popup=ensureInfoPopup();
    const type=button.dataset.nodeType;
    const title=popup.querySelector('.aml-info-title');
    const cost=popup.querySelector('.aml-info-cost');
    const desc=popup.querySelector('.aml-info-desc');

    if(type==='fusion'){
      const left=button.dataset.left;
      const right=button.dataset.right;
      title.textContent=`Fusion ${left} × ${right}`;
      cost.textContent=`💠 ${button.dataset.cost} XP`;
      desc.textContent=`Kombiniert später die voll ausgebauten Fähigkeiten ${left} und ${right} zu einem gemeinsamen Fusionseffekt. Die genaue Wirkung brainstormen wir später.`;
    }else{
      const ability=button.dataset.ability;
      const level=button.dataset.level;
      title.textContent=`Fähigkeit ${ability} · Level ${level}`;
      cost.textContent=`⭐ ${button.dataset.cost} XP`;
      desc.textContent=level==='1'
        ?`Erstes Mastery-Upgrade für Fähigkeit ${ability}. Hier kommt später die konkrete Upgradebeschreibung rein.`
        :`Zweites, stärkeres Mastery-Upgrade für Fähigkeit ${ability}. Voraussetzung: Level 1 dieser Fähigkeit.`;
    }

    popup.classList.remove('hidden');
  }

  function bindNodePopups(){
    tree.querySelectorAll('[data-node-type]').forEach(button=>{
      button.addEventListener('click',()=>openNodeInfo(button));
    });
  }

  function open(){
    render();
    modal.classList.remove('hidden');
    modal.setAttribute('aria-hidden','false');
    document.body.classList.add('ability-mastery-lab-open');
  }

  function close(){
    modal.classList.add('hidden');
    modal.setAttribute('aria-hidden','true');
    document.getElementById('abilityMasteryLabInfo')?.classList.add('hidden');
    document.body.classList.remove('ability-mastery-lab-open');
  }

  closeBtn.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal) close();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'){
      const popup=document.getElementById('abilityMasteryLabInfo');
      if(popup && !popup.classList.contains('hidden')) popup.classList.add('hidden');
      else if(!modal.classList.contains('hidden')) close();
    }
  });

  window.WDAbilityMasteryLab=Object.freeze({open,close,render});
})();
