(() => {
  "use strict";

  const ASSET_REVISION="28.11.1";
  // These URLs are consumed by declarations in css/app.css. Relative URLs in
  // custom properties resolve against that stylesheet, so step out of /css.
  const ASSET_ROOT="../assets/ui/v28/png/worlds/";

  const theme=(primary,secondary,surface,glow,asset)=>{
    const stem=String(asset).replace(/\.png$/i,"");
    return Object.freeze({
      primary,
      secondary,
      surface,
      glow,
      emblem:`${ASSET_ROOT}${stem}.webp`,
      roundFrame:`${ASSET_ROOT}${stem}-frame.webp`,
      rectFrame:`${ASSET_ROOT}${stem}-frame-rect.webp`
    });
  };

  const THEMES=Object.freeze({
    "solo-house":theme("#d5a642","#fff0b5","#17365b","rgba(213,166,66,.28)","world-solo-house.png"),
    "solo-rift":theme("#2b83e6","#9de8ff","#092f69","rgba(43,131,230,.30)","world-solo-rift.png"),
    "solo-zero":theme("#9fc9e8","#f6fdff","#26465f","rgba(159,201,232,.28)","world-solo-zero.png"),
    "solo-abyss":theme("#7d4fc4","#d8b8ff","#160f2b","rgba(125,79,196,.32)","world-solo-abyss.png"),
    "solo-paradox":theme("#d24cb8","#70f0e5","#351047","rgba(210,76,184,.30)","world-solo-paradox.png"),
    "solo-astral":theme("#526fd6","#f3d57c","#171f55","rgba(82,111,214,.31)","world-solo-astral.png"),
    "solo-void":theme("#322744","#a975e8","#07060b","rgba(116,78,166,.34)","world-solo-void.png"),

    "duo-covenant":theme("#356fc4","#e7c66e","#102e59","rgba(53,111,196,.29)","world-duo-covenant.png"),
    "duo-fracture":theme("#d16b37","#ffd07c","#4a1e18","rgba(209,107,55,.30)","world-duo-fracture.png"),
    "duo-mirror":theme("#83c9dc","#f6ffff","#243d55","rgba(131,201,220,.29)","world-duo-mirror.png"),
    "duo-omega":theme("#bd3948","#f3c86d","#451422","rgba(189,57,72,.30)","world-duo-omega.png"),
    "duo-eclipse":theme("#28385f","#f4c85e","#080e22","rgba(76,91,143,.33)","world-duo-eclipse.png"),
    "duo-bloodmoon":theme("#a91f32","#ef9a76","#21070d","rgba(169,31,50,.34)","world-duo-bloodmoon.png"),

    "trio-trinity":theme("#2c9a72","#f1d47e","#103d39","rgba(44,154,114,.29)","world-trio-trinity.png"),
    "trio-helix":theme("#31aeca","#ae76e8","#122e54","rgba(49,174,202,.29)","world-trio-helix.png"),
    "trio-prism":theme("#497ed6","#f2d678","#202a67","rgba(73,126,214,.31)","world-trio-prism.png"),
    "trio-singularity":theme("#171722","#c9b4ef","#030307","rgba(108,84,151,.36)","world-trio-singularity.png")
  });

  const HUBS=[
    {id:"campaignScreen",mode:"solo",button:"[data-world-id]",key:"worldId"},
    {id:"duoCampaignScreen",mode:"duo",button:"[data-duo-world-id]",key:"duoWorldId"},
    {id:"trioCampaignScreen",mode:"trio",button:"[data-trio-world-id]",key:"trioWorldId"}
  ];

  function setProperty(element,name,value){
    if(element.style.getPropertyValue(name)!==value) element.style.setProperty(name,value);
  }

  function applyTheme(element,key){
    const value=THEMES[key];
    if(!element||!value) return;
    if(element.dataset.worldTheme!==key) element.dataset.worldTheme=key;
    setProperty(element,"--world-primary",value.primary);
    setProperty(element,"--world-secondary",value.secondary);
    setProperty(element,"--world-surface",value.surface);
    setProperty(element,"--world-glow",value.glow);
    setProperty(element,"--world-emblem",`url(\"${value.emblem}?v=${ASSET_REVISION}\")`);
    setProperty(element,"--world-frame-round",`url(\"${value.roundFrame}?v=${ASSET_REVISION}\")`);
    setProperty(element,"--world-frame-rect",`url(\"${value.rectFrame}?v=${ASSET_REVISION}\")`);
  }

  function applyToHub(hub,mode,worldId){
    if(!hub||!mode||!worldId) return;
    applyTheme(hub,`${mode}-${worldId}`);
    const config=HUBS.find(entry=>entry.id===hub.id);
    if(!config) return;
    hub.querySelectorAll(config.button).forEach(button=>{
      const id=button.dataset[config.key];
      if(id) applyTheme(button,`${mode}-${id}`);
    });
  }

  function syncHub(config){
    const hub=document.getElementById(config.id);
    if(!hub) return;
    const buttons=[...hub.querySelectorAll(config.button)];
    buttons.forEach(button=>{
      const id=button.dataset[config.key];
      if(id) applyTheme(button,`${config.mode}-${id}`);
    });
    const active=buttons.find(button=>button.classList.contains("active"))||buttons[0];
    const worldId=active?.dataset?.[config.key];
    if(worldId) applyTheme(hub,`${config.mode}-${worldId}`);
  }

  function syncAll(){
    HUBS.forEach(syncHub);
  }

  function init(){
    HUBS.forEach(config=>{
      const hub=document.getElementById(config.id);
      const tabs=hub?.querySelector(".campaign-world-tabs");
      if(!tabs) return;
      const observer=new MutationObserver(syncAll);
      observer.observe(tabs,{childList:true,subtree:true,attributes:true,attributeFilter:["class","disabled"]});
    });
    syncAll();
  }

  window.WDCampaignWorldThemes=Object.freeze({themes:THEMES,assetRoot:ASSET_ROOT,applyTheme,applyToHub,sync:syncAll});
  if(document.readyState==="loading") document.addEventListener("DOMContentLoaded",init,{once:true});
  else init();
})();
