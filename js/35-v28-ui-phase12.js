(() => {
  const VERSION = "28.3.5";

  function abilitiesOpen(){
    const screen = document.getElementById("abilitiesScreen");
    return !!(screen && !screen.classList.contains("hidden"));
  }

  function layoutAbilities(){
    const screen = document.getElementById("abilitiesScreen");
    const list = document.getElementById("allAbilitiesList");
    if(!screen || !list || screen.classList.contains("hidden")) return;

    const inner = screen.querySelector(":scope > .screen-scroll-inner") || screen;
    const topbar = inner.querySelector(".screen-topbar");
    const sub = inner.querySelector(".screen-subtitle");
    const used = (topbar ? topbar.offsetHeight : 0) + (sub ? sub.offsetHeight : 0);
    const available = Math.max(120, inner.clientHeight - used);
    list.style.maxHeight = available + "px";
    list.style.overflowY = "auto";
    list.style.webkitOverflowScrolling = "touch";
  }

  function syncLock(){
    const open = abilitiesOpen();
    document.documentElement.classList.toggle("wd-abilities-open", open);
    if(open){
      window.scrollTo(0, 0);
      requestAnimationFrame(layoutAbilities);
    }else{
      const list = document.getElementById("allAbilitiesList");
      if(list) list.style.maxHeight = "";
    }
  }

  function init(){
    const screen = document.getElementById("abilitiesScreen");
    if(!screen) return;
    const observer = new MutationObserver(syncLock);
    observer.observe(screen, {attributes:true, attributeFilter:["class"]});
    window.addEventListener("resize", () => { if(abilitiesOpen()) layoutAbilities(); }, {passive:true});
    document.getElementById("allAbilitiesBtn")?.addEventListener("click", () => {
      setTimeout(syncLock, 0);
    }, true);
    document.getElementById("abilitiesBackBtn")?.addEventListener("click", () => {
      setTimeout(syncLock, 0);
    }, true);
    syncLock();
    console.info(`[DiceDuel] UI hotfix ${VERSION} active.`);
  }

  if(document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, {once:true});
  else init();
})();
