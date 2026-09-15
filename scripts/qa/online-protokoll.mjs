/* Lokaler Fehlereinspieltest, kein Ersatz fuer online-durchspielen.mjs am
   echten Projekt. Zwei Browser benutzen die echte Engine/Bridge; nur das Netz
   wird kontrolliert. WD_PLAYWRIGHT und WD_CHROMIUM wie im Live-Pruefstand. */
import assert from "node:assert/strict";
import vm from "node:vm";
import { readFileSync } from "node:fs";
import { createServer } from "node:http";
import path from "node:path";
import { fileURLToPath } from "node:url";
const AsyncFunction = Object.getPrototypeOf(async function() {}).constructor;
const { chromium } = await import(process.env.WD_PLAYWRIGHT || "/opt/node22/lib/node_modules/playwright/index.mjs");
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../..");
const server = createServer((req, res) => {
  const file = path.resolve(root, "." + new URL(req.url, "http://localhost").pathname);
  if (!file.startsWith(root + path.sep)) return res.writeHead(403).end();
  try {
    let body = readFileSync(file);
    if (file.endsWith("index.html")) body = body.toString().replace(/<script[^>]+src="js\/(?:backend-config|4[0-3][^"/]*|online\/01-online)\.js[^>]*><\/script>/g, "");
    if (file.endsWith("17-online-bridge.js")) body = body.toString().replace("  window.WDOnlineBridge=", "  window.__qa={session:()=>onlineSession,snapshot:exportOnlineState};\n  window.WDOnlineBridge=");
    const type = { ".html": "text/html", ".js": "text/javascript", ".css": "text/css", ".svg": "image/svg+xml", ".json": "application/json", ".webp": "image/webp" }[path.extname(file)] || "application/octet-stream";
    res.writeHead(200, { "content-type": type }); res.end(body);
  } catch { res.writeHead(404).end(); }
});
await new Promise(r => server.listen(0, "127.0.0.1", r));
const url = `http://127.0.0.1:${server.address().port}/index.html`;
const browsers = [];
const errors = [];
const match = { roomCode: "QATEST", startHp: 50, firstPlayerUid: "gast", players: [
  { uid: "host", name: "Host", ability: 3, diceDesign: "classic" },
  { uid: "gast", name: "Gast", ability: 3, diceDesign: "classic" }
] };
const pause = ms => new Promise(r => setTimeout(r, ms));
let host, gast, seq = 0, sent = 0, snapshots = [], withheld = false;
async function page(uid) {
  const browser = await chromium.launch(process.env.WD_CHROMIUM ? { executablePath: process.env.WD_CHROMIUM, args: ["--no-sandbox"] } : {});
  browsers.push(browser);
  const p = await browser.newPage({ locale: "de-DE", viewport: { width: 390, height: 844 }, serviceWorkers: "block" });
  p.on("pageerror", e => errors.push(e.message));
  p.on("response", r => { if (r.status() >= 400) errors.push(`HTTP ${r.status()} ${new URL(r.url()).pathname}`); });
  await p.goto(url);
  await p.waitForFunction(() => !!window.WDOnlineBridge);
  assert(await p.evaluate(({ match, uid }) => window.WDOnlineBridge.startMatch(match, uid, null, uid === "host"), { match, uid }));
  return p;
}
async function apply(state) { return gast.evaluate(s => window.WDOnlineBridge.applyState(s), state); }
async function waitFinal() { await gast.waitForFunction(() => !window.__qa.session().actionPending); }
async function fixture(attack = false) {
  const state = await host.evaluate(attack => {
    current = 1; phase = attack ? "attack_after_roll" : "idle"; dice = freshDice();
    players.forEach(p => p.hp = 50);
    if (attack) {
      attackFace = 2; attackTarget = 0; attackHits = 5; attackDamage = 10;
      currentAttackRollNewHits = 5; dice.forEach(d => { d.value = 2; d.locked = true; });
    }
    renderAll(); return window.__qa.snapshot();
  }, attack);
  state.seq = ++seq;
  await host.evaluate(s => window.WDOnlineBridge.applyState(s), state);
  await apply(state);
}
// Die produktive Warteschlange mit zwei absichtlich blockierten Netzantworten:
// beide Sequenzen werden lokal sofort vergeben, die RPCs bleiben strikt seriell.
const transportCode = readFileSync(path.join(root, "js/online/01-online.js"), "utf8");
const stageCode = transportCode.slice(transportCode.indexOf("function stageHostState("), transportCode.indexOf("async function rejectHostAction("));
const writes = [], echoes = [], releases = [];
const context = vm.createContext({
  currentRoomCode: "QATEST", currentRoomId: "room", enteredMatchId: "match",
  currentIsHost: true, isSupabaseOnline: true, hostStateSeq: 0, localStateSeq: 0,
  hostPublishChain: Promise.resolve(), bridge: { applyState: state => echoes.push(state) },
  syncPostMatchState() {}, setNotice() {}, console,
  supabaseBackend: { publishState: (_room, state) => { writes.push(state); return new Promise(resolve => releases.push(resolve)); } }
});
vm.runInContext(stageCode, context);
const early = context.stageHostState({ settled: false }, { id: "same", type: "primary" });
const final = context.stageHostState({ settled: true }, { id: "same", type: "primary" });
assert.equal(early.seq, 1); assert.equal(final.seq, 2);
assert.equal(echoes.length, 2, "Host wendet beide Sequenzen ohne Netzantwort lokal an");
await pause(0);
assert.equal(writes.length, 1, "Endstand wartet in der Netz-Warteschlange");
assert.equal(writes[0].actionId, "", "Zwischenstand quittiert die RPC-Aktion nicht");
assert.equal(writes[0].state.actionId, "same", "Zuordnung bleibt im Snapshot erhalten");
releases.shift()(); await pause(0);
assert.equal(writes.length, 2);
assert.equal(writes[1].actionId, "same");
releases.shift()(); await context.hostPublishChain;
console.log("ok: echte Publish-Warteschlange vergibt Sequenzen sofort und sendet seriell");
try {
  host = await page("host"); gast = await page("gast");
  await host.exposeFunction("qaStage", async raw => {
    const state = { ...raw, seq: ++seq };
    snapshots.push(state);
    await host.evaluate(s => window.WDOnlineBridge.applyState(s), state);
    if (!withheld || state.settled === false) await apply(state);
  });
  await gast.exposeFunction("qaSend", async (type, payload, baseSeq) => {
    const request = { id: `test-${++sent}`, type, payload, baseSeq, actorUid: "gast" };
    // Die Antwort auf die Eingabe wartet weder auf Engine noch Publish.
    host.evaluate(async request => {
      const final = await window.WDOnlineBridge.hostExecuteAction(request, raw => { window.qaStage(raw); });
      await window.qaStage(final);
    }, request).catch(e => errors.push(e.message));
    return { requestId: request.id };
  });
  await gast.evaluate(() => { window.WDOnlineTransport = { requestAction: window.qaSend }; });

  await fixture(); snapshots = [];
  await gast.click("#primaryBtn");
  await gast.waitForFunction(() => window.__qa.session().actionPending && document.querySelector("#dice .rolling"));
  await pause(100);
  assert.equal(snapshots.length, 1, "Zwischenstand vor dem Ende des Wurfs");
  assert.equal(snapshots[0].settled, false);
  const pending = await gast.evaluate(() => ({ pending: window.__qa.session().actionPending, timer: !!window.__qa.session().pendingTimer, rolling: !!document.querySelector("#dice .rolling") }));
  assert.deepEqual(pending, { pending: true, timer: true, rolling: true }, "Vorschau und Abbruchtimer bleiben aktiv");
  await gast.evaluate(() => document.querySelector("#primaryBtn").dispatchEvent(new MouseEvent("click", { bubbles: true })));
  assert.equal(sent, 1, "Keine zweite Gastaktion waehrend des Zwischenstands");
  await waitFinal();
  assert.equal(snapshots.length, 2);
  assert.equal(snapshots[1].settled, true);
  const rollStates = structuredClone(snapshots);
  assert(snapshots[1].seq > snapshots[0].seq);
  assert.equal(await apply(snapshots[0]), false, "Verspaeteter Zwischenstand wird verworfen");
  assert.equal(await apply(snapshots[1]), false, "Doppelte Endbestaetigung wird verworfen");
  console.log("ok: Vorschau, Pending, Timer, zwei Sequenzen und verspaetete Pakete");

  await fixture(true); snapshots = [];
  await gast.evaluate(() => {
    window.__qaFx = []; window.__qaHp = [];
    const real = window.WDAttackFx;
    window.WDAttackFx = { ...real, play: fx => { window.__qaFx.push(fx.id); real.play(fx); } };
    const damage = playDamageAnimation;
    playDamageAnimation = (...args) => { window.__qaHp.push(args); return damage(...args); };
  });
  await gast.click("#resolveAttackBtn");
  await waitFinal(); await pause(150);
  assert.equal(snapshots.length, 2);
  const result = await gast.evaluate(() => ({ hp: players[0].hp, fx: window.__qaFx, hpFx: window.__qaHp, last: window.__qa.session().lastCombatFxId, played: [...window.__qa.session().playedCombatFxIds] }));
  assert.equal(result.hp, 40);
  assert(result.fx.length > 0, "Schadensangriff erzeugt Combat-FX");
  assert.equal(result.fx.length, new Set(result.fx).size, "Keine doppelten Combat-FX");
  assert.equal(result.hpFx.length, 1, "HP-Effekt nicht beim Endstand wiederholt");
  assert(result.played.includes(result.last));
  console.log("ok: Schaden und Combat-FX erscheinen genau einmal");

  // Den Messabschnitt des Live-Pruefstands selbst mit der kontrollierten
  // Verbindung ausfuehren. Das validiert Messbeginn und alle sechs UI-Aktionen,
  // liefert aber ausdruecklich keine Latenzmessung am echten Projekt.
  await host.evaluate(seq => {
    window.__wdQaBridge = window.__qa;
    window.__wdQaPublish = raw => { const state = { ...raw, seq: seq + 1 }; window.qaStage(raw); return state; };
  }, seq);
  await gast.evaluate(() => { window.__wdQaBridge = window.__qa; });
  const liveCode = readFileSync(path.join(root, "scripts/qa/online-durchspielen.mjs"), "utf8");
  const measureCode = liveCode.slice(liveCode.indexOf("  const gastUid ="), liveCode.indexOf("  // Der Lobbybutton"));
  const measurements = [];
  await new AsyncFunction("host", "gast", "warte", "messungen", "pruefe", measureCode)(host, gast, pause, measurements, (ok, message) => assert(ok, message));
  assert.equal(measurements.length, 6);
  assert(measurements.every(m => Number.isFinite(m.sichtbarMs) && m.bestaetigtMs >= m.sichtbarMs));
  console.log("ok: Live-Messablauf lokal geprueft (keine echten Netz-Messwerte)");

  // Netzwerk ohne Bestaetigung: der unveraenderte 8000-ms-Timer bricht ab.
  await fixture(); withheld = true;
  await gast.click("#primaryBtn");
  await gast.waitForFunction(() => !window.__qa.session().actionPending, null, { timeout: 9500 });
  assert(await gast.evaluate(() => !window.__qa.session().pendingTimer && !isAnimating && !document.body.classList.contains("online-remote-roll-preview")));
  console.log("ok: 8000-ms-Abbruch beendet Pending und Vorschau");
  for (const language of ["de", "en"]) {
    await gast.evaluate(language => localStorage.setItem("diceduel_language", language), language);
    await gast.reload();
    await gast.evaluate(match => window.WDOnlineBridge.startMatch(match, "gast", null, false), match);
    for (const width of [320, 360, 390, 412, 1280]) {
      await gast.setViewportSize({ width, height: 900 });
      await apply({ ...rollStates[0], seq: ++seq });
      assert(await gast.evaluate(() => window.__qa.session().actionPending && !!document.querySelector("#dice .rolling") && document.querySelector("#primaryBtn").disabled));
      await apply({ ...rollStates[1], seq: ++seq });
      assert(await gast.evaluate(() => !window.__qa.session().actionPending && !document.querySelector("#dice .rolling")));
    }
  }
  console.log("ok: Zwischenstand/Endstand bei 320, 360, 390, 412 und 1280 px, DE/EN");
  assert.deepEqual(errors, [], "Keine JS-Fehler oder HTTP-Fehler");
} finally {
  for (const browser of browsers) await browser.close();
  server.close();
}
