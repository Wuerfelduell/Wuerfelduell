(() => {
  const VERSION = "28.0.2";
  const ABILITY_ICONS = {
    1:"◆",2:"♥",3:"⚄",4:"↻",5:"⚔",7:"✦",8:"◎",9:"♨",10:"↗",11:"◉",12:"✧",13:"♜",14:"⚓",15:"◇",16:"↯",17:"★",18:"⚅",19:"⬟",20:"◌",21:"⛨",22:"12",23:"♦",24:"⚔",25:"△"
  };

  function isAbilitySelect(select){
    if(!select || select.tagName!=="SELECT") return false;
    return /^(abilityChoice\d+|nextAbilityChoice\d+(?:_\d+)?)$/.test(select.id||"");
  }

  let picker=null;

  function escapeText(value){
    return String(value??"").replace(/[&<>"']/g,ch=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[ch]));
  }

  function optionName(opt){
    const id=Number(opt.value);
    const data=(typeof ABILITIES!=="undefined" && ABILITIES[id])
      ? ABILITIES[id].name
      : opt.textContent.replace(/^\s*\d+\s*[–·-]\s*/,"");
    return {id,name:data||opt.textContent};
  }

  function ensurePicker(){
    if(picker) return picker;
    picker=document.createElement("div");
    picker.className="v28-ability-picker hidden";
    picker.innerHTML=`
      <div class="v28-ability-picker-panel" role="dialog" aria-modal="true" aria-label="Fähigkeit wählen">
        <div class="v28-ability-picker-head">
          <div class="v28-ability-picker-kicker">DICEDUEL · ABILITY</div>
          <div class="v28-ability-picker-title">Fähigkeit wählen</div>
        </div>
        <div class="v28-ability-picker-list"></div>
        <button type="button" class="v28-ability-picker-close secondary">Abbrechen</button>
      </div>`;
    document.body.appendChild(picker);
    picker.querySelector(".v28-ability-picker-close").addEventListener("click",closePicker);
    picker.addEventListener("click",e=>{ if(e.target===picker) closePicker(); });
    return picker;
  }

  function closePicker(){
    if(!picker) return;
    picker.classList.add("hidden");
    document.body.style.overflow="";
  }

  function syncTrigger(select){
    const trigger=select.__v28Trigger;
    if(!trigger) return;
    const opt=select.options[select.selectedIndex];
    if(!opt){
      trigger.textContent="Fähigkeit wählen";
    }else{
      const {id,name}=optionName(opt);
      trigger.innerHTML=`<span>${ABILITY_ICONS[id]||"✦"} &nbsp;${id} · ${escapeText(name)}</span>`;
    }
    trigger.disabled=!!select.disabled;
    trigger.classList.toggle("hidden",select.classList.contains("hidden"));
  }

  function openPicker(select){
    // Read the live select state only when the user actually opens it.
    syncTrigger(select);
    if(select.disabled || select.classList.contains("hidden")) return;

    const p=ensurePicker();
    const list=p.querySelector(".v28-ability-picker-list");
    list.innerHTML="";

    [...select.options].forEach(opt=>{
      const {id,name}=optionName(opt);
      const btn=document.createElement("button");
      btn.type="button";
      btn.className="v28-ability-option"+(String(select.value)===String(opt.value)?" selected":"");
      btn.innerHTML=`<span class="v28-icon">${ABILITY_ICONS[id]||"✦"}</span><span class="v28-name">${id} · ${escapeText(name)}</span><span class="v28-check">✓</span>`;
      btn.addEventListener("click",()=>{
        select.value=opt.value;
        select.dispatchEvent(new Event("change",{bubbles:true}));
        syncTrigger(select);
        closePicker();
      });
      list.appendChild(btn);
    });

    p.classList.remove("hidden");
    document.body.style.overflow="hidden";
    requestAnimationFrame(()=>list.querySelector(".selected")?.scrollIntoView({block:"center"}));
  }

  function enhance(select){
    if(!isAbilitySelect(select) || select.dataset.v28Enhanced) return;
    select.dataset.v28Enhanced="1";
    select.classList.add("v28-native-ability-select");

    const trigger=document.createElement("button");
    trigger.type="button";
    trigger.className="v28-ability-trigger";
    trigger.addEventListener("click",()=>openPicker(select));
    select.insertAdjacentElement("afterend",trigger);
    select.__v28Trigger=trigger;

    select.addEventListener("change",()=>syncTrigger(select));

    // Observe only this select. The old global attribute observer reacted to
    // normal screen/button class changes and could churn the UI event loop.
    const stateObserver=new MutationObserver(()=>syncTrigger(select));
    stateObserver.observe(select,{attributes:true,attributeFilter:["class","disabled"]});
    select.__v28StateObserver=stateObserver;

    syncTrigger(select);
  }

  function scan(root=document){
    if(root.nodeType===1 && root.matches?.("select")) enhance(root);
    root.querySelectorAll?.("select").forEach(enhance);
  }

  function init(){
    document.documentElement.dataset.v28="bright-arcane";
    scan(document);

    // Setup and round-prep ability selects are created dynamically.
    // Watch DOM additions only; never all UI class/disabled changes.
    const domObserver=new MutationObserver(records=>{
      for(const record of records){
        for(const node of record.addedNodes){
          if(node.nodeType===1) scan(node);
        }
      }
    });
    domObserver.observe(document.body,{childList:true,subtree:true});

    console.info(`[DiceDuel] Bright Arcane UI ${VERSION} active.`);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
