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
      <div class="aml-node aml-ability-node aml-${side} aml-${tone}" data-number="${number}" data-level="${level}">
        <div class="aml-node-orbit"></div>
        <div class="aml-node-core">
          <span class="aml-node-number">${number}</span>
          <small>L${level}</small>
        </div>
        <div class="aml-node-tag">
          <strong>${cost}</strong>
          <span>XP</span>
        </div>
      </div>`;
  }

  function fusionNode(number,tone){
    return `
      <div class="aml-node aml-fusion-node aml-${tone}" data-fusion="${number}">
        <div class="aml-fusion-halo halo-a"></div>
        <div class="aml-fusion-halo halo-b"></div>
        <div class="aml-fusion-core">
          <small>FUSION</small>
          <strong>${number}</strong>
          <span>1000 XP</span>
        </div>
      </div>`;
  }

  function pairMarkup(pair,index){
    return `
      <section class="aml-pair aml-pair-${pair.tone}" data-pair="${index}">
        <svg class="aml-links" viewBox="0 0 800 530" preserveAspectRatio="none" aria-hidden="true">
          <defs>
            <linearGradient id="grad-${index}-l" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0" stop-color="rgba(255,255,255,.10)"/>
              <stop offset=".55" stop-color="var(--aml-accent)"/>
              <stop offset="1" stop-color="var(--aml-accent2)"/>
            </linearGradient>
            <linearGradient id="grad-${index}-r" x1="1" y1="0" x2="0" y2="1">
              <stop offset="0" stop-color="rgba(255,255,255,.10)"/>
              <stop offset=".55" stop-color="var(--aml-accent)"/>
              <stop offset="1" stop-color="var(--aml-accent2)"/>
            </linearGradient>
            <filter id="glow-${index}">
              <feGaussianBlur stdDeviation="5" result="blur"/>
              <feMerge><feMergeNode in="blur"/><feMergeNode in="SourceGraphic"/></feMerge>
            </filter>
          </defs>
          <path class="aml-link aml-link-dim" d="M170 85 C170 150 170 190 220 245"/>
          <path class="aml-link aml-link-dim" d="M630 85 C630 150 630 190 580 245"/>
          <path class="aml-link aml-link-hot" filter="url(#glow-${index})" stroke="url(#grad-${index}-l)" d="M220 245 C250 335 315 385 400 445"/>
          <path class="aml-link aml-link-hot" filter="url(#glow-${index})" stroke="url(#grad-${index}-r)" d="M580 245 C550 335 485 385 400 445"/>
        </svg>

        <div class="aml-branch aml-branch-left">
          ${branchNode(pair.left,1,'left',pair.tone)}
          ${branchNode(pair.left,2,'left',pair.tone)}
        </div>

        <div class="aml-pair-emblem">
          <span>${String(pair.left).padStart(2,'0')}</span>
          <i>×</i>
          <span>${String(pair.right).padStart(2,'0')}</span>
        </div>

        <div class="aml-branch aml-branch-right">
          ${branchNode(pair.right,1,'right',pair.tone)}
          ${branchNode(pair.right,2,'right',pair.tone)}
        </div>

        ${fusionNode(pair.fusion,pair.tone)}
      </section>`;
  }

  function render(){
    tree.innerHTML=`
      <div class="aml-tree-intro">
        <div>
          <small>ABILITY BRANCHES</small>
          <strong>Level 1 → Level 2 → Fusion</strong>
        </div>
        <div class="aml-tree-chip">6 Äste · 3 Fusionen</div>
      </div>
      ${pairs.map(pairMarkup).join('')}
      <div class="aml-future-node">
        <span>?</span>
        <div><strong>WEITERE FUSIONEN</strong><small>nur Platzhalter für spätere Cross-Links</small></div>
      </div>
    `;
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
    document.body.classList.remove('ability-mastery-lab-open');
  }

  closeBtn.addEventListener('click',close);
  modal.addEventListener('click',e=>{if(e.target===modal) close();});
  document.addEventListener('keydown',e=>{
    if(e.key==='Escape'&&!modal.classList.contains('hidden')) close();
  });

  window.WDAbilityMasteryLab=Object.freeze({open,close,render});
})();
