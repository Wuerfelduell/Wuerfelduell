/* Prüfstand für subscribeRoom in js/43-supabase-battle.js.
   Lädt die echte Datei mit gestubbtem window.WDSupabase, spielt die
   Ereignisfolge eines Gastzuges nach und misst, wann der Gast den neuen
   Stand sieht. Kein Netz, keine Datenbank.

   Aufruf: node abo2.mjs [ms je Abfrage]

   Der Scheinclient liest den Zustand beim *Start* der Abfrage, nicht bei
   ihrer Antwort. Das ist die vorsichtige Annahme: eine Abfrage, die
   losläuft bevor der Host geschrieben hat, bringt den alten Stand. */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const NETZ = Number(process.argv[2] || 180);
const GAST = "gast-uid", HOST = "host-uid";
const warten = ms => new Promise(r => setTimeout(r, ms));

function laden() {
  const handler = new Map();
  const welt = { seq: 1 };
  let abrufe = 0;

  const antwort = async (nutzlast) => { const gelesen = welt.seq; await warten(NETZ); return nutzlast(gelesen); };
  const client = {
    async rpc() { abrufe++; return antwort(seq => ({ data: [{ id: "r", meta: {}, state: { seq } }], error: null })); },
    from() { const k = { select: () => k, eq: () => k, order: () => k, limit: () => antwort(() => ({ data: [], error: null })) }; return k; },
    channel() {
      return {
        on(_t, filter, cb) { if (!handler.has(filter.table)) handler.set(filter.table, []); handler.get(filter.table).push(cb); return this; },
        subscribe() { return this; }
      };
    },
    removeChannel: async () => {}
  };
  const fenster = { WDSupabase: { configured: true, getClient: async () => client,
    ensureOnlineIdentity: async () => ({ id: GAST, email: "", is_anonymous: true }) } };
  vm.runInContext(readFileSync("js/43-supabase-battle.js", "utf8"),
    vm.createContext({ window: fenster, console, setTimeout, clearTimeout, Date, Promise, Array, Object, Number, String, JSON, Math }));
  return { backend: fenster.WDSupabaseBattleBackend, handler, welt, zaehler: () => abrufe };
}

const feuern = (h, tabelle, nachricht) => (h.get(tabelle) || []).forEach(f => f(nachricht));

async function gastzug(hostAntwortNach) {
  const { backend, handler, welt, zaehler } = laden();
  let hoechster = 1, gesehen = 0;
  await backend.subscribeRoom("r", s => { const q = s?.state?.seq || 0; if (q > hoechster) { hoechster = q; gesehen = Date.now(); } }, () => {});
  await warten(NETZ + 80);
  const vorher = zaehler();

  const start = Date.now();
  feuern(handler, "dd_battle_actions", { eventType: "INSERT", new: { actor_user_id: GAST, status: "queued" } });
  await warten(hostAntwortNach);
  welt.seq = 2;
  feuern(handler, "dd_battle_states", { eventType: "UPDATE", new: { actor_user_id: HOST } });

  while (Date.now() - start < 5000 && !gesehen) await warten(10);
  return { abrufe: zaehler() - vorher, bis: gesehen - start, ideal: hostAntwortNach + 45 + NETZ };
}

console.log(`Abfrage dauert ${NETZ} ms. "ideal" = Hostantwort + Debounce + eine Abfrage.\n`);
console.log("Hostantwort   Abrufe   Gast sieht   ideal   Verlust");
let summe = 0, faelle = 0;
for (const t of [20, 60, 100, 140, 180, 220, 260, 300, 400]) {
  const r = await gastzug(t);
  const verlust = r.bis - r.ideal;
  summe += verlust; faelle++;
  console.log(`${String(t).padStart(9)} ms ${String(r.abrufe).padStart(7)} ${String(r.bis).padStart(10)} ms ${String(r.ideal).padStart(7)} ${verlust > 8 ? String(verlust).padStart(8) + " ms" : "        —"}`);
}
console.log(`\nDurchschnittlicher Verlust: ${Math.round(summe / faelle)} ms`);
