(() => {
  "use strict";

  // Registrierung bewusst erst nach dem load-Event: waehrend des Boot-Gates
  // konkurriert der Service-Worker-Download sonst mit den Spielassets.
  if(!("serviceWorker" in navigator)) return;
  if(location.protocol !== "https:" && location.hostname !== "localhost" && location.hostname !== "127.0.0.1") return;

  function register(){
    navigator.serviceWorker.register("sw.js", {scope: "./"}).then(registration => {
      console.info("[DiceDuel] Service Worker aktiv.");
      // Beim naechsten Start liegt dann schon der neue Stand bereit.
      registration.update?.().catch(() => {});
    }).catch(error => {
      console.warn("[DiceDuel] Service Worker konnte nicht registriert werden.", error);
    });
  }

  // Notausstieg fuer den Fall, dass ein Cache einmal quer liegt:
  // in der Konsole WDServiceWorker.reset() aufrufen.
  window.WDServiceWorker = {
    async reset(){
      const registrations = await navigator.serviceWorker.getRegistrations();
      await Promise.all(registrations.map(r => r.unregister()));
      const names = await caches.keys();
      await Promise.all(names.filter(n => n.startsWith("diceduel-")).map(n => caches.delete(n)));
      console.info("[DiceDuel] Service Worker und Caches entfernt. Seite neu laden.");
    }
  };

  if(document.readyState === "complete") register();
  else window.addEventListener("load", register, {once: true});
})();
