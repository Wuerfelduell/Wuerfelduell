/* DiceDuel Service Worker
   ------------------------------------------------------------------
   Bewusst ohne Precache-Liste: die haette bei jeder neuen Datei von Hand
   nachgepflegt werden muessen und waere still veraltet. Stattdessen wird
   zur Laufzeit gecacht, was tatsaechlich angefragt wird.

   Strategien:
   - Navigation (das HTML-Dokument): network-first. Online bekommt man immer
     den aktuellen Build, offline die letzte bekannte Fassung. Damit kann ein
     Update nie an einem festhaengenden Dokument scheitern.
   - assets/ und die App-Icons: cache-first. Das sind Bilder und SVGs, die
     sich ohne Umbenennung nicht aendern.
   - css/ und js/: stale-while-revalidate. Sofort aus dem Cache, im
     Hintergrund erneuert. Ein vergessener ?v=-Bump fuehrt so hoechstens zu
     einem Besuch mit alter Datei statt dauerhaft.

   Alles andere (Firebase, CDN-Module) laeuft unangetastet ans Netz.

   CACHE_VERSION anheben, wenn alte Eintraege bewusst verworfen werden
   sollen; beim Aktivieren werden dann alle uebrigen DiceDuel-Caches
   geloescht. */

const CACHE_VERSION = "28.10.1";
const CACHE_NAME = `diceduel-${CACHE_VERSION}`;

self.addEventListener("install", event => {
  // Kein Precache, also gibt es nichts zu warten - direkt bereit werden.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(
      names.filter(n => n.startsWith("diceduel-") && n !== CACHE_NAME)
           .map(n => caches.delete(n))
    );
    await self.clients.claim();
  })());
});

function isAsset(pathname){
  return pathname.includes("/assets/")
      || /\/icon-\d+\.png$/.test(pathname)
      || pathname.endsWith("/manifest.json");
}

function isCode(pathname){
  return pathname.includes("/css/") || pathname.includes("/js/") || pathname.includes("/lang/");
}

async function cacheFirst(request){
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  if(hit) return hit;
  const response = await fetch(request);
  if(response.ok) cache.put(request, response.clone());
  return response;
}

async function staleWhileRevalidate(event){
  const request = event.request;
  const cache = await caches.open(CACHE_NAME);
  const hit = await cache.match(request);
  const fresh = fetch(request).then(response => {
    if(response.ok) cache.put(request, response.clone());
    return response;
  }).catch(() => null);
  if(hit){
    // Erneuerung laeuft im Hintergrund weiter. Ohne waitUntil duerfte der
    // Worker beendet werden, bevor der neue Stand im Cache liegt.
    event.waitUntil(fresh);
    return hit;
  }
  const response = await fresh;
  if(response) return response;
  throw new Error("offline und nicht im Cache");
}

async function networkFirst(request){
  const cache = await caches.open(CACHE_NAME);
  try{
    const response = await fetch(request);
    if(response.ok) cache.put(request, response.clone());
    return response;
  }catch(error){
    const hit = await cache.match(request);
    if(hit) return hit;
    throw error;
  }
}

self.addEventListener("fetch", event => {
  const request = event.request;
  if(request.method !== "GET") return;

  const url = new URL(request.url);
  if(url.origin !== self.location.origin) return; // Firebase, CDN-Module: unangetastet

  if(request.mode === "navigate"){
    event.respondWith(networkFirst(request));
    return;
  }
  if(isAsset(url.pathname)){
    event.respondWith(cacheFirst(request));
    return;
  }
  if(isCode(url.pathname)){
    event.respondWith(staleWhileRevalidate(event));
  }
});
