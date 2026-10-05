import {actions, createServerRng, createState, definitions, reduce, validateState} from './engine.ts';
import type {DuelAction, Mulberry32State, RngState} from './engine.ts';

function equal(actual: unknown, expected: unknown, message = 'Werte unterscheiden sich'): void {
  if (JSON.stringify(actual) !== JSON.stringify(expected)) {
    throw new Error(message + '\nIst: ' + JSON.stringify(actual) + '\nSoll: ' + JSON.stringify(expected));
  }
}
function throws(callback: () => unknown, constructor: typeof Error): void {
  try {callback();} catch (error) {if (error instanceof constructor) return; throw error;}
  throw new Error('Erwartete Ausnahme fehlt: ' + constructor.name);
}
const initial = (seed = 0): Mulberry32State => ({algorithm: 'mulberry32', seed, state: seed, drawIndex: 0});
const setup = (seed = 0) => ({modeId: 'classic' as const,
  players: [{seat: 0, abilities: [5]}, {seat: 1, abilities: [2]}], rng: initial(seed)});

Deno.test('Importreihenfolge liefert die gemeinsame, unveränderte API', () => {
  const state = createState(setup());
  equal(validateState(state), {valid: true, errors: []});
  equal(definitions.RULE_VERSION, 'duel-1');
  equal(actions.ROLL_BASE, 'roll_base');
  equal(Object.isFrozen(definitions.LOCAL_MODES.classic), true);
});

Deno.test('Mulberry32-Golden-Vektoren für Null, Vorzeichenbit und uint32-Maximum', () => {
  // Feste Werte aus dem bereits vorhandenen WDRng.useSeed; keine Adapterformel im Test.
  for (const [seed, values, finalState] of [
    [0, [0.26642920868471265, 0.0003297457005828619, 0.2232720274478197, 0.1462021479383111], 3031295956],
    [0x80000000, [0.8205775609239936, 0.4481089550536126, 0.7836112855002284, 0.5120457962621003], 883812308],
    [0xffffffff, [0.8964226141106337, 0.189478256739676, 0.7156526781618595, 0.9440599093213677], 3031295955]
  ] as const) {
    const rng = createServerRng(initial(seed));
    equal(Array.from({length: 4}, () => rng.random()), values);
    equal(rng.snapshot(), {algorithm: 'mulberry32', seed, state: finalState, drawIndex: 4});
  }
});

Deno.test('Fortsetzung liest den gespeicherten Zustand statt erneut den Seed', () => {
  const input: Mulberry32State = {algorithm: 'mulberry32', seed: 99, state: 0, drawIndex: 17};
  const rng = createServerRng(Object.freeze(input));
  equal(rng.random(), 0.26642920868471265);
  equal(rng.snapshot(), {algorithm: 'mulberry32', seed: 99, state: 1831565813, drawIndex: 18});
  equal(input, {algorithm: 'mulberry32', seed: 99, state: 0, drawIndex: 17});
});

Deno.test('JSON-Checkpoint setzt den privaten RNG bitgenau fort', () => {
  const rng = createServerRng(initial());
  rng.random(); rng.random();
  const resumed = createServerRng(JSON.parse(JSON.stringify(rng.snapshot())));
  equal([resumed.random(), resumed.random()], [rng.random(), rng.random()]);
  equal(resumed.snapshot(), rng.snapshot());
  const leaked = resumed.snapshot(); leaked.state = 0; leaked.drawIndex = 0;
  equal(resumed.snapshot(), rng.snapshot(), 'Snapshots dürfen die Generatorinstanz nicht verändern');
});

Deno.test('Zwei parallel verwendete Generatoren teilen keine Instanz', () => {
  const left = createServerRng(initial()), right = createServerRng(initial(0xffffffff));
  equal(left.random(), 0.26642920868471265);
  equal(right.random(), 0.8964226141106337);
  equal(left.random(), 0.0003297457005828619);
  equal(right.random(), 0.189478256739676);
  equal([left.snapshot().drawIndex, right.snapshot().drawIndex], [2, 2]);
});

Deno.test('Reducer schreibt state und drawIndex genau einmal fort und verändert keinen Eingang', () => {
  let actual = createState(setup()), expected = createState(setup());
  const moves: DuelAction[] = [{type: actions.ROLL_BASE, seat: 0},
    {type: actions.TOGGLE_BASE_DIE, seat: 0, index: 0}, {type: actions.LOCK_SELECTED, seat: 0},
    {type: actions.ROLL_BASE, seat: 0}];
  for (const move of moves) {
    const before = JSON.stringify(actual), rng = createServerRng(actual.rng);
    const result = reduce(actual, move, rng), reference = reduce(expected, move);
    equal(result, reference, 'Injizierter Server-RNG entspricht dem nativen Reducer-RNG');
    equal(JSON.stringify(actual), before, 'Der Eingang muss unverändert bleiben');
    equal(result.state.rng, rng.snapshot());
    equal(validateState(result.state).valid, true);
    actual = JSON.parse(JSON.stringify(result.state)); expected = reference.state;
  }
  equal(actual.rng.drawIndex, 9, 'Fünf und vier Würfel, keine Ziehungen für Auswahl und Locken');
});

Deno.test('Ablehnungen verbrauchen keine Ziehungen und behalten die Zustandsidentität', () => {
  const state = createState(setup()), rng = createServerRng(state.rng);
  const result = reduce(state, {type: actions.ROLL_BASE, seat: 1}, rng);
  equal(result.rejected, true); equal(result.events, []);
  equal(result.state === state, true); equal(rng.snapshot(), state.rng);
  state.players[0].hp = -1;
  const invalid = reduce(state, {type: actions.ROLL_BASE, seat: 0}, rng);
  equal(invalid.rejected, true); equal(invalid.state === state, true); equal(rng.snapshot(), state.rng);
});

Deno.test('Ein Zufallsgeber aus einem fremden Zustand wird vor jeder Ziehung abgewiesen', () => {
  const state = createState(setup()), rng = createServerRng(initial(1));
  const before = JSON.stringify(state), rngBefore = rng.snapshot();
  throws(() => reduce(state, {type: actions.ROLL_BASE, seat: 0}, rng), TypeError);
  equal(JSON.stringify(state), before); equal(rng.snapshot(), rngBefore);
});

Deno.test('Externer oder ungültiger RNG-Zustand wird nicht still ersetzt', () => {
  const invalid = [null, {}, {algorithm: 'external', seed: null, state: null, drawIndex: 0},
    {...initial(), seed: -1}, {...initial(), seed: 0x100000000}, {...initial(), state: null},
    {...initial(), state: 1.5}, {...initial(), state: NaN}, {...initial(), drawIndex: -1},
    {...initial(), drawIndex: Number.MAX_SAFE_INTEGER + 1}];
  for (const input of invalid) throws(() => createServerRng(input as RngState), TypeError);
});

Deno.test('Ein ausgeschöpfter Ziehungszähler verändert auch den Generatorzustand nicht', () => {
  const rng = createServerRng({...initial(), drawIndex: Number.MAX_SAFE_INTEGER}), before = rng.snapshot();
  throws(() => rng.random(), RangeError); equal(rng.snapshot(), before);
});

Deno.test('Server-Reduktion benötigt weder Umgebungszufall noch Uhrzeit oder Netzwerk', () => {
  const random = Math.random, now = Date.now, fetch = globalThis.fetch;
  const forbidden = (): never => {throw new Error('Unerlaubter Zugriff auf die Laufzeitumgebung');};
  try {
    Math.random = forbidden; Date.now = forbidden; globalThis.fetch = forbidden;
    const state = createState(setup()), rng = createServerRng(state.rng);
    const result = reduce(state, {type: actions.ROLL_BASE, seat: 0}, rng);
    equal(result.rejected, undefined); equal(result.state.rng.drawIndex, 5);
  } finally {Math.random = random; Date.now = now; globalThis.fetch = fetch;}
});
