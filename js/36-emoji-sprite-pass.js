(() => {
  "use strict";

  const VERSION="28.5.3";
  const ROOT="assets/ui/v28/svg/";

  // Alle noch relevanten Laufzeit-Piktogramme landen hier auf vorhandenen
  // Bright-Arcane-Sprites. Nicht bekannte Extended-Pictographic-Zeichen
  // erhalten bewusst das neutrale Challenge-Sprite statt eines Font-Emojis.
  const ICONS=Object.freeze({
    "🍀":"abilities/03-glueckswurf.svg",
    "🎲":"gameplay/dice.svg",
    "🐍":"abilities/20-snake-eyes.svg",
    "⚡":"gameplay/mastery.svg",
    "🩸":"gameplay/self-damage-blood.svg",
    "🔫":"abilities/24-double-tap.svg",
    "🎰":"abilities/12-gambling-man.svg",
    "⚔":"gameplay/attack.svg",
    "🎯":"gameplay/target.svg",
    "🤖":"gameplay/bot.svg",
    "⚙":"navigation/info.svg",
    "👹":"gameplay/boss.svg",
    "✓":"gameplay/completed.svg",
    "✅":"gameplay/completed.svg",
    "✕":"navigation/warning.svg",
    "•":"gameplay/encounter.svg",
    "▶":"navigation/chevron-right.svg",
    "🏆":"gameplay/trophy.svg",
    "🔓":"navigation/unlock.svg",
    "🔒":"gameplay/locked.svg",
    "🔐":"gameplay/locked.svg",
    "🎁":"gameplay/reward-gift.svg",
    "⭐":"gameplay/xp-star.svg",
    "✨":"gameplay/attack.svg",
    "🌐":"menu/online.svg",
    "💀":"gameplay/loss.svg",
    "⚠":"navigation/warning.svg",
    "🤝":"gameplay/duo.svg",
    "💪":"gameplay/trio.svg",
    "🧍":"gameplay/player.svg",
    "👤":"gameplay/player.svg",
    "🎮":"gameplay/player.svg",
    "💺":"gameplay/seat-position.svg",
    "🗺":"gameplay/campaign.svg",
    "🏠":"navigation/back.svg",
    "🏁":"gameplay/loss.svg",
    "🎓":"menu/tutorial.svg",
    "🧪":"gameplay/challenge.svg",
    "🎨":"gameplay/mastery.svg",
    "🖼":"gameplay/player.svg",
    "🔥":"gameplay/streak-flame.svg",
    "💥":"gameplay/damage-sword.svg",
    "❤":"gameplay/heart-hp.svg",
    "🤡":"gameplay/self-damage-blood.svg",
    "🧲":"gameplay/shield.svg",
    "😭":"navigation/warning.svg",
    "🧽":"gameplay/shield.svg",
    "🔁":"navigation/refresh-reroll.svg",
    "🔄":"navigation/refresh-reroll.svg",
    "↩":"navigation/back-arrow.svg",
    "👑":"gameplay/crown.svg",
    "🧬":"gameplay/mastery.svg",
    "🚫":"navigation/warning.svg",
    "🛡":"gameplay/shield.svg",
    "☠":"gameplay/loss.svg",
    "🃏":"abilities/17-wildcard.svg",
    "🪃":"abilities/16-ricochet.svg",
    "😡":"abilities/09-rache.svg",
    "🐕":"abilities/25-underdog.svg",
    "⌛":"gameplay/challenge.svg",
    "⏳":"gameplay/challenge.svg",
    "☰":"navigation/menu-hamburger.svg",
    "🗡":"gameplay/attack.svg",
    "⚀":"gameplay/dice.svg",
    "⚁":"gameplay/dice.svg",
    "⚂":"gameplay/dice.svg",
    "⚃":"gameplay/dice.svg",
    "⚄":"gameplay/dice.svg",
    "⚅":"gameplay/dice.svg",
    "✦":"gameplay/mastery.svg",
    "♠":"fx/card-spade.svg",
    "♥":"fx/card-heart.svg",
    "♦":"fx/card-diamond.svg",
    "♣":"fx/card-club.svg",
    "♛":"gameplay/crown.svg",
    "↗":"navigation/chevron-right.svg",
    "↯":"gameplay/attack.svg",
    "↳":"navigation/chevron-right.svg",
    "↻":"navigation/refresh-reroll.svg",
    "⇄":"navigation/refresh-reroll.svg",
    "⌄":"navigation/chevron-down.svg",
    "△":"gameplay/challenge.svg",
    "◆":"ornaments/diamond.svg",
    "◇":"ornaments/diamond.svg",
    "◉":"gameplay/target.svg",
    "◌":"gameplay/target.svg",
    "◎":"gameplay/target.svg",
    "★":"ornaments/star.svg",
    "♜":"gameplay/crown.svg",
    "♨":"gameplay/streak-flame.svg",
    "⚓":"gameplay/shield.svg",
    "⛨":"gameplay/shield.svg",
    "✧":"ornaments/star.svg",
    "⬟":"gameplay/shield.svg",
    "💠":"gameplay/mastery.svg"
  });

  const ID_ICONS=Object.freeze({
    gamblingRetryBtn:"abilities/12-gambling-man.svg",
    counterRollBtn:"abilities/21-counterattack.svg",
    tutorialHubStartBtn:"menu/tutorial.svg",
    winTrackerLabel:"gameplay/trophy.svg",
    baseRerollBtn:"abilities/03-glueckswurf.svg",
    loadedDiceBtn:"abilities/18-loaded-dice.svg",
    snakeEyesBtn:"abilities/20-snake-eyes.svg",
    attackPowerBtn:"abilities/04-zweite-chance.svg",
    bloodLowerBtn:"abilities/11-blutpreis.svg",
    bloodRushMasteryBtn:"abilities/23-blood-rush.svg",
    bloodHigherBtn:"abilities/11-blutpreis.svg",
    nextRoundPrepBtn:"gameplay/dice.svg",
    onlineMainMenuBtn:"navigation/back.svg"
  });

  const TEST_SELECTOR=[
    "#testLabAbilityModal",
    "#abilityMasteryLabModal",
    "#testLabWorkbench",
    "#testLab3dDiceTray",
    "#tutorialHubLabBtn",
    "[id^='testLab']",
    "[id^='abilityMasteryLab']",
    ".test-lab-workbench",
    ".test-lab-3d-tray"
  ].join(",");
  const TEST_SESSION_SURFACES=[
    "#game","#winnerBox","#nextRoundBox","#secondAbilityModal",
    "#gamblingModal","#highStakesModal","#perfect25Modal",
    "#perfect25D4Modal","#insuranceModal","#counterModal"
  ].join(",");
  const ALWAYS_SKIP="script,style,template,textarea,select,option,#log,.dd-emoji-sprite";
  const DICE_SKIP=".die,.special-big-die,.gambling-die,.counter-die,.die-cube,.die-flat-face,.special-die-flat-face";

  const escapeRegExp=value=>value.replace(/[.*+?^${}()|[\]\\]/g,"\\$&");
  const mappedTokens=Object.keys(ICONS).sort((a,b)=>b.length-a.length).map(escapeRegExp).join("|");
  const TOKEN_RE=new RegExp(`(?:${mappedTokens}|[\\u{1F1E6}-\\u{1F1FF}]{2}|[#*0-9]\\uFE0F?\\u20E3|\\p{Extended_Pictographic})(?:\\uFE0E|\\uFE0F)?`,"gu");

  function normalizedToken(raw){return String(raw||"").replace(/[\uFE0E\uFE0F]/g,"");}

  function inHiddenSurface(element){
    const hidden=element.closest(".hidden");
    return !!hidden;
  }

  function shouldSkip(node){
    const element=node?.nodeType===Node.ELEMENT_NODE?node:node?.parentElement;
    if(!element||element.closest(ALWAYS_SKIP)||element.closest(TEST_SELECTOR)||element.closest(DICE_SKIP)) return true;
    if(inHiddenSurface(element)) return true;
    if(document.body.classList.contains("test-lab-active")&&element.closest(TEST_SESSION_SURFACES)) return true;
    return false;
  }

  function spritePath(token,parent){
    const owner=parent?.closest?.("[id]");
    if(owner&&ID_ICONS[owner.id]) return ID_ICONS[owner.id];
    const normalized=normalizedToken(token);
    if(/^[\u{1F1E6}-\u{1F1FF}]{2}$/u.test(normalized)) return "gameplay/world.svg";
    return ICONS[normalized]||"gameplay/challenge.svg";
  }

  function spriteImage(path,sourceGlyph=""){
    const image=document.createElement("img");
    image.className="dd-emoji-sprite";
    image.src=ROOT+path;
    image.alt="";
    image.draggable=false;
    image.setAttribute("aria-hidden","true");
    image.dataset.sourceGlyph=sourceGlyph;
    return image;
  }

  function sprite(token,parent){
    return spriteImage(spritePath(token,parent),normalizedToken(token));
  }

  function decorateContextualElement(element){
    if(!element||!ID_ICONS[element.id]||shouldSkip(element)) return;
    if(element.querySelector(":scope > .dd-emoji-sprite")) return;
    element.prepend(spriteImage(ID_ICONS[element.id]));
  }

  function decorateContextualElements(root){
    if(root?.nodeType!==Node.ELEMENT_NODE&&root?.nodeType!==Node.DOCUMENT_NODE&&root?.nodeType!==Node.DOCUMENT_FRAGMENT_NODE) return;
    if(root.nodeType===Node.ELEMENT_NODE) decorateContextualElement(root);
    root.querySelectorAll?.(Object.keys(ID_ICONS).map(id=>`#${id}`).join(",")).forEach(decorateContextualElement);
  }

  function decorateTextNode(node){
    if(!node?.nodeValue||shouldSkip(node)) return;
    const source=node.nodeValue;
    TOKEN_RE.lastIndex=0;
    let match=TOKEN_RE.exec(source);
    if(!match) return;

    const fragment=document.createDocumentFragment();
    let cursor=0;
    do{
      if(match.index>cursor) fragment.append(document.createTextNode(source.slice(cursor,match.index)));
      fragment.append(sprite(match[0],node.parentElement));
      cursor=match.index+match[0].length;
      match=TOKEN_RE.exec(source);
    }while(match);
    if(cursor<source.length) fragment.append(document.createTextNode(source.slice(cursor)));
    node.replaceWith(fragment);
  }

  function scan(root){
    if(!root||shouldSkip(root)) return;
    if(root.nodeType===Node.TEXT_NODE){
      const parent=root.parentElement;
      decorateTextNode(root);
      decorateContextualElement(parent);
      return;
    }
    if(root.nodeType!==Node.ELEMENT_NODE&&root.nodeType!==Node.DOCUMENT_NODE&&root.nodeType!==Node.DOCUMENT_FRAGMENT_NODE) return;
    const walker=document.createTreeWalker(root,NodeFilter.SHOW_TEXT);
    const nodes=[];
    while(walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(decorateTextNode);
    decorateContextualElements(root);
  }

  function restoreTestSessionSprites(){
    document.querySelectorAll(TEST_SESSION_SURFACES).forEach(surface=>{
      surface.querySelectorAll(".dd-emoji-sprite[data-source-glyph]").forEach(image=>{
        image.replaceWith(document.createTextNode(image.dataset.sourceGlyph||""));
      });
    });
  }

  const pending=new Set();
  let queued=false;
  function schedule(node){
    if(!node) return;
    pending.add(node);
    if(queued) return;
    queued=true;
    queueMicrotask(()=>{
      queued=false;
      const roots=[...pending];
      pending.clear();
      roots.forEach(scan);
    });
  }

  function init(){
    document.documentElement.dataset.ddEmojiSprites="1";
    scan(document.body);
    const observer=new MutationObserver(records=>{
      if(document.body.classList.contains("test-lab-active")) restoreTestSessionSprites();
      records.forEach(record=>{
        if(record.type==="characterData") schedule(record.target);
        else if(record.type==="childList") record.addedNodes.forEach(schedule);
        else if(record.type==="attributes"&&!record.target.classList?.contains("hidden")) schedule(record.target);
      });
    });
    observer.observe(document.body,{subtree:true,childList:true,characterData:true,attributes:true,attributeFilter:["class"]});
    console.info(`[DiceDuel] Emoji sprite pass ${VERSION} active.`);
  }

  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
