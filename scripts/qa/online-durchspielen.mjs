/* Online-Match einmal echt durchspielen, in zwei Browsern.
   ==================================================================
   Wozu: Ein Online-Fehler laesst sich am Quelltext nicht entscheiden.
   Serverfunktionen, Zeilenregeln, Realtime und der Browsercode greifen
   ineinander; faellt eines aus, sieht der Spieler dasselbe Nichts. Dieses
   Skript startet zwei getrennte Browser gegen das echte Projekt, legt
   einen Raum an, tritt bei, meldet beide bereit, laesst das Match starten
   und spielt einen Wurf. Danach raeumt es auf.

   Es misst dabei nicht den Bildschirm, sondern den Ablauf: Kommt die
   Anmeldung durch, sieht der Host den Gast, springen beide ins Match,
   und traegt der Wurf des einen beim anderen an.

   ------------------------------------------------------------------
   Zwei Umwege, die nur in dieser Sandbox noetig sind:

   1. Der Ausgangsproxy laesst den TLS-Handshake von Chromium nicht
      durch, den von Node schon. Deshalb faengt page.route die
      HTTPS-Aufrufe ab und Node fuehrt sie aus.
   2. Realtime laeuft ueber WebSocket, und den kann page.route nicht
      abfangen. Dafuer laeuft eine kleine Bruecke: die Seite bekommt ein
      Ersatz-WebSocket, das auf einen lokalen Server zeigt, der die Frames
      an das echte Projekt weiterreicht.

   Der App-Code selbst bleibt unangetastet - er sieht ein normales
   WebSocket und normale Antworten. Auf einem Rechner ohne diesen Proxy
   kann man beide Umwege weglassen.

   ------------------------------------------------------------------
   Vorbereitung (einmalig):

     npx http-server -p 8099 -c-1 --silent .          # in einem zweiten Fenster
     mkdir -p /var/tmp/sbtest && cd /var/tmp/sbtest
     npm init -y && npm i @supabase/supabase-js@2.114.0 ws esbuild
     echo 'export * from "@supabase/supabase-js";' > entry.mjs
     npx esbuild entry.mjs --bundle --format=esm --platform=browser \
       --outfile=supabase-esm.js

   Das Buendel wird gebraucht, weil die Seite die Bibliothek sonst vom
   CDN holt und auch das hier gesperrt ist.

   Aufruf:  node scripts/qa/online-durchspielen.mjs
*/
import { chromium } from "/opt/node22/lib/node_modules/playwright/index.mjs";
import wsPaket from "/var/tmp/sbtest/node_modules/ws/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

const { WebSocketServer, WebSocket } = wsPaket;

const wurzel = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
const BASIS = process.env.WD_BASIS || "http://127.0.0.1:8099/index.html";
const WSPORT = 8123;
const LIB = readFileSync("/var/tmp/sbtest/supabase-esm.js", "utf8");
const warte = ms => new Promise(r => setTimeout(r, ms));

// Projektadresse aus der Browserkonfiguration lesen, nicht doppelt pflegen.
const konfig = readFileSync(path.join(wurzel, "js", "backend-config.js"), "utf8");
const projekt = konfig.match(/projectUrl\s*:\s*"([^"]+)"/)?.[1] || "";
if (!projekt) { console.error("Keine projectUrl in js/backend-config.js gefunden."); process.exit(1); }
const wirt = new URL(projekt).host;

/* ---------- Bruecke fuer Realtime ---------- */
function starteBruecke() {
  const server = new WebSocketServer({ port: WSPORT });
  server.on("connection", (client, req) => {
    const ziel = new URL(req.url, "http://x").searchParams.get("target");
    if (!ziel) return client.close();
    const oben = new WebSocket(ziel);
    const puffer = [];
    oben.on("open", () => { for (const m of puffer.splice(0)) oben.send(m); });
    oben.on("message", d => { if (client.readyState === 1) client.send(d.toString()); });
    oben.on("close", c => { try { client.close(c >= 1000 && c < 5000 ? c : 1000); } catch {} });
    oben.on("error", e => { console.log("[bruecke]", e.message); try { client.close(); } catch {} });
    client.on("message", d => { const s = d.toString(); oben.readyState === 1 ? oben.send(s) : puffer.push(s); });
    client.on("close", () => { try { oben.close(); } catch {} });
  });
  return server;
}
const wsErsatz = `(() => {
  const Echt = window.WebSocket;
  const Ersatz = function (url, protocols) {
    const s = String(url);
    if (/${wirt.replace(/\./g, "\\.")}/.test(s)) {
      const durch = "ws://127.0.0.1:${WSPORT}/?target=" + encodeURIComponent(s.replace(/^ws:/, "wss:"));
      const sock = protocols === undefined ? new Echt(durch) : new Echt(durch, protocols);
      try { Object.defineProperty(sock, "url", { value: s }); } catch (_) {}
      return sock;
    }
    return protocols === undefined ? new Echt(s) : new Echt(s, protocols);
  };
  Ersatz.prototype = Echt.prototype;
  for (const k of ["CONNECTING", "OPEN", "CLOSING", "CLOSED"]) Ersatz[k] = Echt[k];
  window.WebSocket = Ersatz;
})();`;

/* ---------- HTTPS durch Node ---------- */
async function durchreichen(route) {
  const req = route.request();
  try {
    const kopf = { ...req.headers() };
    delete kopf["accept-encoding"]; delete kopf.host; delete kopf.connection;
    const antwort = await fetch(req.url(), {
      method: req.method(), headers: kopf,
      body: ["GET", "HEAD"].includes(req.method()) ? undefined : req.postData() ?? undefined,
      redirect: "manual"
    });
    const roh = Buffer.from(await antwort.arrayBuffer());
    const raus = {};
    antwort.headers.forEach((v, k) => {
      if (!["content-encoding", "content-length", "transfer-encoding", "connection"].includes(k.toLowerCase())) raus[k] = v;
    });
    raus["access-control-allow-origin"] = "*";
    await route.fulfill({ status: antwort.status, headers: raus, body: roh });
  } catch (e) {
    console.log("[netz]", req.method(), req.url().slice(0, 80), e.message);
    await route.abort();
  }
}

/* ---------- Ablauf ---------- */
let fehler = 0;
const pruefe = (bedingung, text) => { console.log(`  ${bedingung ? "ok" : "FEHLER"}: ${text}`); if (!bedingung) fehler = 1; };

const bruecke = starteBruecke();
const browser = await chromium.launch();

async function seite(name, profilname) {
  const p = await (await browser.newContext({ viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(wsErsatz);
  p.on("pageerror", e => console.log(`  [${name}] Seitenfehler: ${String(e).slice(0, 160)}`));
  p.on("response", async r => {
    if (r.status() >= 400 && r.url().includes(wirt))
      console.log(`  [${name}] HTTP ${r.status()} ${r.url().slice(-50)} ${(await r.text().catch(() => "")).slice(0, 140)}`);
  });
  await p.route(`**/*${wirt}/**`, durchreichen);
  await p.route("**/cdn.jsdelivr.net/**", route => /supabase-js/.test(route.request().url())
    ? route.fulfill({ status: 200, contentType: "text/javascript", body: LIB })
    : route.abort());
  await p.goto(BASIS, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  // Ohne Profil bleibt "Raum erstellen" gesperrt.
  await p.click("#menuProfilesBtn");
  await p.waitForSelector("#profilesScreen:not(.hidden)", { timeout: 15000 });
  await p.fill("#newProfileName", profilname);
  await p.click("#createProfileBtn");
  await p.waitForTimeout(1500);
  await p.click("#profilesBackBtn");
  await p.waitForSelector("#mainMenu:not(.hidden)", { timeout: 15000 });
  await p.waitForTimeout(800);
  await p.click("#menuOnlineBtn");
  await p.waitForTimeout(6000);
  return p;
}

const lage = p => p.evaluate(() => ({
  status: document.querySelector("#onlineStatus")?.textContent || "",
  code: document.querySelector("#onlineRoomCode")?.textContent || "",
  spieler: document.querySelectorAll(".online-player").length,
  bereit: document.querySelectorAll(".online-player.ready").length,
  imSpiel: !document.querySelector("#game")?.classList.contains("hidden")
      && document.querySelector("#onlineScreen")?.classList.contains("hidden"),
  zug: document.querySelector("#turnLine, .turn-card h3")?.textContent?.trim().slice(0, 40) || "",
  summe: document.querySelector("#sum")?.textContent?.trim() || "",
  augen: [...document.querySelectorAll("#dice .die")].map(d => d.dataset.value || d.textContent.trim()).join(","),
  knopfGesperrt: !!document.querySelector("#primaryBtn")?.disabled
}));

try {
  console.log("== Anmeldung ==");
  const host = await seite("host", "HostPruef");
  const gast = await seite("gast", "GastPruef");
  pruefe(/verbunden/i.test((await lage(host)).status), "der Host meldet sich am Projekt an");
  pruefe(/verbunden/i.test((await lage(gast)).status), "der Gast meldet sich am Projekt an");

  console.log("\n== Lobby ==");
  await host.click("#onlineCreateBtn");
  await host.waitForTimeout(6000);
  const raum = await lage(host);
  pruefe(/^[A-Z0-9]{6}$/.test(raum.code), `der Host bekommt einen Raumcode (${raum.code})`);
  if (!/^[A-Z0-9]{6}$/.test(raum.code)) throw new Error("kein Raum");

  await gast.fill("#onlineJoinCode", raum.code);
  await gast.click("#onlineJoinBtn");
  await gast.waitForTimeout(6000);
  pruefe((await lage(gast)).spieler === 2, "der Gast tritt bei und sieht beide Spieler");
  pruefe((await lage(host)).spieler === 2, "der Host sieht den Gast, ohne neu zu laden");

  console.log("\n== Bereit und Start ==");
  await gast.click("#onlineReadyBtn");
  await gast.waitForTimeout(2500);
  pruefe((await lage(host)).bereit === 1, "die Bereitmeldung des Gastes erreicht den Host");
  await host.click("#onlineReadyBtn");
  await host.waitForTimeout(9000);
  pruefe((await lage(host)).imSpiel, "der Host landet im Match");
  pruefe((await lage(gast)).imSpiel, "der Gast landet im Match");

  console.log("\n== Ein Zug ==");
  const vorher = await lage(host);
  const dran = vorher.knopfGesperrt ? { s: gast, n: "Gast" } : { s: host, n: "Host" };
  await dran.s.click("#primaryBtn", { timeout: 10000 });
  await dran.s.waitForTimeout(7000);
  const nachHost = await lage(host), nachGast = await lage(gast);
  pruefe(nachHost.summe !== "" && nachHost.summe !== "0", `der Wurf des ${dran.n} steht beim Host (Summe ${nachHost.summe})`);
  pruefe(nachGast.summe === nachHost.summe, `beide Seiten zeigen dieselbe Summe (${nachGast.summe})`);
  pruefe(nachGast.augen === nachHost.augen && nachGast.augen !== "", `beide Seiten zeigen dieselben Augen (${nachGast.augen})`);
  pruefe(nachGast.zug === nachHost.zug, `beide Seiten zeigen denselben Zug (${nachGast.zug})`);

  await host.click("#onlineLeaveBtn").catch(() => {});
  await gast.click("#onlineLeaveBtn").catch(() => {});
  await warte(2000);
} catch (e) {
  console.error("Abbruch:", e?.message || e);
  fehler = 1;
} finally {
  await browser.close();
  bruecke.close();
  console.log(fehler ? "\nEs gab Abweichungen." : "\nDas Online-Match laeuft von der Anmeldung bis zum ersten Wurf.");
  process.exit(fehler);
}
