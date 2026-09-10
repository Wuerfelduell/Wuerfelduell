/* Zusicherungen fuer subscribeRoom (js/43-supabase-battle.js): welche
   Realtime-Meldung einen Schnappschuss ausloesen muss und welche nicht.
   Laedt die echte Datei mit gestubbtem window.WDSupabase - kein Netz.
   Aufruf: node scripts/qa/raum-abo.mjs   (Ausgang 0 = alles gruen)
   Zeiten messen: node scripts/qa/raum-abo-zeiten.mjs [ms je Abfrage] */
/* Zusicherungen für subscribeRoom: was übersprungen werden darf und was nicht. */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const NETZ = 60;
const warten = ms => new Promise(r => setTimeout(r, ms));

function laden(eigeneUid) {
  const handler = new Map();
  let abrufe = 0;
  const antwort = async n => { await warten(NETZ); return n(); };
  const client = {
    async rpc() { abrufe++; return antwort(() => ({ data: [{ id: "r", meta: {}, state: { seq: abrufe } }], error: null })); },
    from() { const k = { select: () => k, eq: () => k, order: () => k, limit: () => antwort(() => ({ data: [], error: null })) }; return k; },
    channel() { return { on(_t, f, cb) { if (!handler.has(f.table)) handler.set(f.table, []); handler.get(f.table).push(cb); return this; }, subscribe() { return this; } }; },
    removeChannel: async () => {}
  };
  const fenster = { WDSupabase: { configured: true, getClient: async () => client,
    ensureOnlineIdentity: async () => ({ id: eigeneUid, email: "", is_anonymous: true }) } };
  vm.runInContext(readFileSync("js/43-supabase-battle.js", "utf8"),
    vm.createContext({ window: fenster, console, setTimeout, clearTimeout, Date, Promise, Array, Object, Number, String, JSON, Math }));
  return { backend: fenster.WDSupabaseBattleBackend, handler, zaehler: () => abrufe };
}
const feuern = (h, t, n) => (h.get(t) || []).forEach(f => f(n));

const faelle = [];
const pruefe = (name, ist, soll) => { const ok = ist === soll; faelle.push(ok); console.log(`${ok ? "ok  " : "FEHL"}  ${name}: ${ist} (erwartet ${soll})`); };

async function lauf(eigeneUid, tabelle, nachricht) {
  const { backend, handler, zaehler } = laden(eigeneUid);
  const stop = await backend.subscribeRoom("r", () => {}, () => {});
  await warten(NETZ + 80);
  const vorher = zaehler();
  feuern(handler, tabelle, nachricht);
  await warten(NETZ + 140);
  await stop();
  return zaehler() - vorher;
}

const GAST = "gast", HOST = "host";

pruefe("eigene Aktionszeile wird uebersprungen",
  await lauf(GAST, "dd_battle_actions", { eventType: "INSERT", new: { actor_user_id: GAST } }), 0);

pruefe("fremde Aktionszeile loest aus (Host sieht den Gast)",
  await lauf(HOST, "dd_battle_actions", { eventType: "INSERT", new: { actor_user_id: GAST } }), 1);

pruefe("Verwerfen der eigenen Aktion loest aus (UPDATE)",
  await lauf(GAST, "dd_battle_actions", { eventType: "UPDATE", new: { actor_user_id: GAST, status: "rejected" } }), 1);

pruefe("Zustandsschreibung loest aus",
  await lauf(GAST, "dd_battle_states", { eventType: "UPDATE", new: {} }), 1);

pruefe("Aktionszeile ohne Akteursangabe loest aus (kein stiller Verlust)",
  await lauf(GAST, "dd_battle_actions", { eventType: "INSERT", new: {} }), 1);

// Ereignis waehrend eines laufenden Abrufs darf nicht verloren gehen
{
  const { backend, handler, zaehler } = laden(GAST);
  await backend.subscribeRoom("r", () => {}, () => {});
  await warten(NETZ + 80);
  const vorher = zaehler();
  feuern(handler, "dd_battle_states", { eventType: "UPDATE", new: {} });
  await warten(60);                                   // Abruf laeuft bereits
  feuern(handler, "dd_battle_events", { eventType: "INSERT", new: {} });
  await warten(NETZ * 3 + 200);
  pruefe("Ereignis waehrend eines Abrufs wird nachgeholt", zaehler() - vorher, 2);
}

console.log(faelle.every(Boolean) ? "\nAlle Zusicherungen gruen." : "\nFEHLGESCHLAGEN.");
process.exit(faelle.every(Boolean) ? 0 : 1);
