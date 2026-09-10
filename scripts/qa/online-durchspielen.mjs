/* Online-Match einmal echt durchspielen, in zwei Browsern.
   ==================================================================
   Wozu: Ein Online-Fehler laesst sich am Quelltext nicht entscheiden.
   Serverfunktionen, Zeilenregeln, Realtime und der Browsercode greifen
   ineinander; faellt eines aus, sieht der Spieler dasselbe Nichts. Dieses
   Skript startet zwei getrennte Browser gegen das echte Projekt, legt
   einen Raum an, tritt bei, meldet beide bereit, laesst das Match starten
   und prueft den ersten Wurf (die bestehenden zwoelf Zusicherungen).
   Danach misst es sechs reproduzierbare Gastaktionen samt Schadensangriff.

   Die Messung beginnt im Capture-Handler der echten Gasteingabe. Pro Frame
   werden sichtbare Augen, Sicherungsmarken, HP, Summe und Zuganzeige geprueft.
   Reine lokale Rollvorschau zaehlt nicht als bestaetigtes Wuerfelergebnis.
   Sichtbare Zustandsaenderung und finale Freigabe werden getrennt berichtet.
   Die sechs Aktionen benutzen ausschliesslich isolierte QA-Profile und eine
   festgelegte Wuerfelfolge, damit Vorher und Nachher dieselben Zustaende sehen.

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
     npm init -y && npm i @supabase/supabase-js@2.114.0 ws esbuild https-proxy-agent
     echo 'export * from "@supabase/supabase-js";' > entry.mjs
     npx esbuild entry.mjs --bundle --format=esm --platform=browser \
       --outfile=supabase-esm.js

   Das Buendel wird gebraucht, weil die Seite die Bibliothek sonst vom
   CDN holt und auch das hier gesperrt ist.

   Aufruf: WD_SERVE=1 WD_LABEL=nachher WD_REPORT=/tmp/nachher.json \
     node scripts/qa/online-durchspielen.mjs
   WD_PLAYWRIGHT: Pfad zur Playwright-index.mjs; WD_CHROMIUM: Browserpfad.
   WD_SOURCE_ROOT: anderer Checkout fuer die Vorher-Messung mit demselben
   Pruefstand (z.B. git worktree add --detach /tmp/wd-vorher <Basiscommit>).
   Ohne WD_SERVE wird der bereits laufende Server unter WD_BASIS verwendet.
   Keine Messwerte aus einem abgebrochenen Lauf als Nachweis verwenden.
*/
const { chromium } = await import(process.env.WD_PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs");
import wsPaket from "/var/tmp/sbtest/node_modules/ws/index.js";
import { HttpsProxyAgent } from "/var/tmp/sbtest/node_modules/https-proxy-agent/dist/index.js";
import { readFileSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";
import { createServer } from "node:http";

const { WebSocketServer, WebSocket } = wsPaket;

const wurzel = process.env.WD_SOURCE_ROOT ? path.resolve(process.env.WD_SOURCE_ROOT) : path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..", "..");
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
    if (!ziel || new URL(ziel).hostname !== wirt || new URL(ziel).protocol !== "wss:") return client.close();
    const oben = new WebSocket(ziel, process.env.HTTPS_PROXY ? { agent: new HttpsProxyAgent(process.env.HTTPS_PROXY) } : {});
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
    console.log("[netz]", req.method(), new URL(req.url()).pathname, e.message);
    await route.abort();
  }
}

/* ---------- Ablauf ---------- */
let fehler = 0;
const pruefe = (bedingung, text) => { console.log(`  ${bedingung ? "ok" : "FEHLER"}: ${text}`); if (!bedingung) fehler = 1; };

const lokal = process.env.WD_SERVE ? createServer((req, res) => {
  const datei = path.resolve(wurzel, "." + decodeURIComponent(new URL(req.url, BASIS).pathname));
  if (!datei.startsWith(wurzel + path.sep)) { res.writeHead(403).end(); return; }
  try {
    const typ = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".json": "application/json", ".svg": "image/svg+xml", ".webp": "image/webp", ".png": "image/png" }[path.extname(datei)] || "application/octet-stream";
    res.writeHead(200, { "content-type": typ, "cache-control": "no-store" }); res.end(readFileSync(datei));
  } catch { res.writeHead(404).end(); }
}) : null;
if (lokal) await new Promise(r => lokal.listen(Number(new URL(BASIS).port), "127.0.0.1", r));
const bruecke = starteBruecke();
const browserOptionen = process.env.WD_CHROMIUM ? { executablePath: process.env.WD_CHROMIUM, args: ["--no-sandbox"] } : {};
const browsers = [];
const messungen = [];
const technischeFehler = [];
const berichten = () => {
  const mittel = feld => messungen.length ? Math.round(messungen.reduce((s, m) => s + m[feld], 0) / messungen.length) : null;
  const bericht = { label: process.env.WD_LABEL || "Messung", aktionen: messungen, mittelSichtbarMs: mittel("sichtbarMs"), mittelBestaetigtMs: mittel("bestaetigtMs"), technischeFehler, bestanden: !fehler };
  console.log(JSON.stringify(bericht, null, 2));
  if (process.env.WD_REPORT) writeFileSync(process.env.WD_REPORT, JSON.stringify(bericht, null, 2) + "\n");
};

async function seite(name, profilname) {
  const browser = await chromium.launch(browserOptionen);
  browsers.push(browser);
  const p = await (await browser.newContext({ locale: "de-DE", serviceWorkers: "block", viewport: { width: 412, height: 900 } })).newPage();
  await p.addInitScript(wsErsatz);
  p.on("pageerror", e => { technischeFehler.push(`${name}: ${e.message}`); fehler = 1; });
  p.on("response", r => {
    if (r.status() >= 400) { technischeFehler.push(`${name}: HTTP ${r.status()} ${new URL(r.url()).pathname}`); fehler = 1; }
  });
  // Nur im Pruefstand: Beobachtung der privaten Bridge und reproduzierbare
  // Ausgangslage. Aktionen, Engine, RPCs und Realtime bleiben der echte App-Code.
  await p.route("**/js/17-online-bridge.js?*", route => {
    const code = readFileSync(path.join(wurzel, "js/17-online-bridge.js"), "utf8").replace("  window.WDOnlineBridge=", "  window.__wdQaBridge={snapshot:exportOnlineState,session:()=>({...onlineSession,pendingTimer:!!onlineSession.pendingTimer})};\n  window.WDOnlineBridge=");
    return route.fulfill({ contentType: "text/javascript", body: code });
  });
  await p.route("**/js/online/01-online.js?*", route => route.fulfill({ contentType: "text/javascript", body: readFileSync(path.join(wurzel, "js/online/01-online.js"), "utf8") + "\nwindow.__wdQaPublish=stageHostState;" }));
  await p.route(`**/*${wirt}/**`, durchreichen);
  await p.route("**/cdn.jsdelivr.net/**", route => /supabase-js/.test(route.request().url())
    ? route.fulfill({ status: 200, contentType: "text/javascript", body: LIB })
    : route.abort());
  await p.goto(BASIS, { waitUntil: "domcontentloaded" });
  await p.waitForTimeout(3000);
  // Ohne Profil bleibt "Raum erstellen" gesperrt.
  await p.click("#menuProfilesBtn");
  await p.waitForSelector("#profilesScreen:not(.hidden)", { timeout: 15000 });
  await p.click("#profileCreateToggle");
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

  console.log("\n== Fuenf reproduzierbare Gastaktionen ==");
  const gastUid = await gast.evaluate(() => window.__wdQaBridge.session().uid);
  // Isolierte QA-Profile, gleicher Startzustand in A und B. Nur der Test
  // legt die Wuerfelfolge fest; die Produktions-Wuerfellogik wird nicht editiert.
  const fixtureSeq = await host.evaluate(gastUid => {
    current = players.findIndex(p => p.onlineUid === gastUid);
    players.forEach(p => { p.ability = 3; p.secondAbility = null; p.thirdAbility = null; p.hp = 25; });
    phase = "idle"; dice = freshDice(); isAnimating = false;
    window.__wdQaRolls = [6, 5, 5, 5, 5, 5, 5, 5, 5, 1, 1, 1, 1, 1];
    const echt = rollTrackedD6;
    rollTrackedD6 = (...args) => window.__wdQaRolls.length ? window.__wdQaRolls.shift() : echt(...args);
    renderAll();
    return window.__wdQaPublish(window.__wdQaBridge.snapshot()).seq;
  }, gastUid);
  await gast.waitForFunction(seq => window.__wdQaBridge.session().lastStateSeq >= seq, fixtureSeq);

  async function messen(name, selector, vorherAuswahl = false) {
    if (vorherAuswahl) {
      for (const die of (await gast.locator("#dice .die:not(.locked)").all()).slice(0, vorherAuswahl === "eins" ? 1 : undefined)) await die.click();
    }
    await gast.evaluate(({ name, selector }) => {
      const signatur = () => JSON.stringify({
        summe: document.querySelector("#sum")?.textContent,
        augen: [...document.querySelectorAll("#dice .die")].map(d => [d.dataset.value, d.classList.contains("locked")]),
        hp: [...document.querySelectorAll("#players .hp strong")].map(el => el.textContent),
        zug: document.querySelector("#turnLine")?.textContent
      });
      const vorher = signatur();
      const startSeq = window.__wdQaBridge.session().lastStateSeq;
      const m = window.__wdQaMessung = { name, fertig: false };
      const knopf = document.querySelector(selector);
      document.addEventListener("click", event => {
        if (!knopf.contains(event.target)) return;
        m.start = performance.now();
        const bild = () => {
          const session = window.__wdQaBridge.session();
          const rollt = !!document.querySelector("#dice .rolling");
          if (m.vorschauMs == null && rollt) m.vorschauMs = performance.now() - m.start;
          // Auch identische Augen sind ein sichtbares Wurfergebnis, sobald
          // die bestaetigte Animation endet. Der lokale Start zaehlt separat.
          if (m.sichtbarMs == null && session.lastStateSeq > startSeq &&
              (signatur() !== vorher || (selector === "#primaryBtn" && !rollt))) m.sichtbarMs = performance.now() - m.start;
          if (session.lastStateSeq > startSeq && !session.actionPending && m.sichtbarMs != null) {
            m.bestaetigtMs = performance.now() - m.start; m.fertig = true; return;
          }
          requestAnimationFrame(bild);
        };
        requestAnimationFrame(bild);
      }, { capture: true, once: true });
    }, { name, selector });
    await gast.click(selector);
    await gast.waitForFunction(() => window.__wdQaMessung.fertig, null, { timeout: 15000 });
    const m = await gast.evaluate(() => { const { name, sichtbarMs, bestaetigtMs, vorschauMs } = window.__wdQaMessung; return { name, sichtbarMs: Math.round(sichtbarMs), bestaetigtMs: Math.round(bestaetigtMs), vorschauMs: vorschauMs == null ? null : Math.round(vorschauMs) }; });
    messungen.push(m);
    console.log(`  ${name}: sichtbar ${m.sichtbarMs} ms, bestaetigt ${m.bestaetigtMs} ms`);
    await warte(200);
  }
  await messen("Basiswurf", "#primaryBtn");
  await messen("Einen Wuerfel sichern", "#lockBtn", "eins");
  await messen("Rest wuerfeln", "#primaryBtn");
  await messen("Rest sichern", "#lockBtn", true);
  await messen("Angriffswurf", "#primaryBtn");
  const hpVorher = await gast.evaluate(() => players.map(p => p.hp));
  await messen("Angriff mit Schaden", "#resolveAttackBtn");
  pruefe(await gast.evaluate(vorher => players.some((p, i) => p.hp < vorher[i]), hpVorher), "der gemessene Angriff verursacht Schaden");

  pruefe(messungen.length >= 5, "mindestens fuenf Gastaktionen gemessen");
  // Der Lobbybutton ist im Match unsichtbar, sein bestehender Handler bleibt
  // fuer die Testbereinigung nutzbar (keine zusaetzlichen RPCs).
  await gast.evaluate(() => document.querySelector("#onlineLeaveBtn").click());
  await warte(1000);
  await host.evaluate(() => document.querySelector("#onlineLeaveBtn").click());
  await warte(2000);
} catch (e) {
  console.error("Abbruch:", e?.message || e);
  fehler = 1;
} finally {
  for (const browser of browsers) await browser.close();
  bruecke.close();
  lokal?.close();
  berichten();
  console.log(fehler ? "\nEs gab Abweichungen." : "\nZwoelf bestehende Zusicherungen und sechs Gastaktionen bestanden.");
  process.exit(fehler);
}
