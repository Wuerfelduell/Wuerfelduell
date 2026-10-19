// Node erzeugt vollständige Mehr-Runden-Matches; Deno erhält nur Setup und Aktionen.
import assert from 'node:assert/strict';
import {spawn, spawnSync} from 'node:child_process';
import {mkdtemp, rm, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {createInterface} from 'node:readline';
import {fileURLToPath, pathToFileURL} from 'node:url';

const root = fileURLToPath(new URL('../../', import.meta.url));
const deno = process.env.DENO_BIN || 'deno';
const version = spawnSync(deno, ['--version'], {encoding: 'utf8'});
if (version.error?.code === 'ENOENT') {
  console.error('Deno fehlt. Deno 2.x installieren: curl -fsSL https://deno.land/install.sh | sh');
  console.error('Danach ~/.deno/bin zum PATH hinzufügen oder DENO_BIN auf den Deno-Pfad setzen.');
  process.exit(2);
}
if (version.error || version.status !== 0 || !/^deno 2\./m.test(version.stdout)) {
  console.error('Deno 2.x ist erforderlich:', version.error?.message || version.stderr || version.stdout);
  process.exit(1);
}
console.log(version.stdout.trim());

for (const file of ['01-rng.js', '02-definitions.js', '03-state.js', '04-rules.js', '05-reduce.js']) {
  await import(new URL('../../js/engine/' + file, import.meta.url));
}
const {createState, validateState, reduce, actions: A, definitions: D} = globalThis.WDEngine;
const modes = ['classic', 'endurance50', 'overload75', 'mayhem'];
const seeds = [...Array.from({length: 13}, (_, index) => index), 0x80000000, 0xffffffff];
// Die Engine zählt Rundensiege, enthält aber kein Matchlimit. Der Prüfstand
// beendet ein Match beim zweiten Rundensieg, also nach mindestens zwei Runden.
const winsRequired = 2;
const maxActions = 100000;
const rows = modes.flatMap(modeId => [2, 3, 4, 5, 6].map(playerCount => ({
  modeId, playerCount, duels: 0, actions: 0, differences: 0
})));

function botAction(state, seed) {
  const seat = state.turn.decision?.seat ?? state.turn.currentSeat;
  const action = (type, extra = {}) => ({type, seat, ...extra});
  switch (state.turn.phase) {
    case 'idle': case 'base_ready': return action(A.ROLL_BASE);
    case 'base_select': {
      const open = state.dice.map((die, index) => ({...die, index})).filter(die => !die.locked);
      const high = open.filter(die => die.value >= 5);
      const selected = new Set((high.length ? high : [open.reduce((best, die) =>
        die.value > best.value ? die : best)]).map(die => die.index));
      const toggle = open.find(die => die.selected !== selected.has(die.index));
      return toggle ? action(A.TOGGLE_BASE_DIE, {index: toggle.index}) : action(A.LOCK_SELECTED);
    }
    case 'attack_target': {
      const target = state.players.filter(player => player.hp > 0 && player.seat !== seat)
        .sort((left, right) => left.hp - right.hp || left.seat - right.seat)[0];
      return action(A.CHOOSE_ATTACK_TARGET, {targetSeat: target.seat});
    }
    case 'attack_ready': case 'attack_continue': return action(A.ROLL_ATTACK);
    case 'attack_after_roll': return action(A.RESOLVE_ATTACK);
    case 'gamble_attack': case 'gamble_retry': return action(A.ROLL_GAMBLING);
    case 'gamble_retry_offer': return action(seed % 2 ? A.ACCEPT_GAMBLING_RETRY : A.DECLINE_GAMBLING_RETRY);
    case 'perfect25': return action(A.ROLL_PERFECT25);
    case 'perfect25_d4': return action(A.ROLL_PERFECT25_D4);
    case 'insurance': return action(A.ROLL_INSURANCE);
    case 'high_stakes': return action(seed % 2 ? A.ROLL_HIGH_STAKES : A.SKIP_HIGH_STAKES);
    case 'counterattack': return action(A.ROLL_COUNTERATTACK);
    case 'draft_pending': return action(A.CHOOSE_ABILITY, {abilityId: state.draft.active.choices[seed % 2]});
    case 'turn_done': return action(A.END_TURN);
    case 'round_preparation': {
      switch (state.turn.decision.kind) {
        case 'prepare_round': return action(A.PREPARE_ROUND);
        case 'start_round': return action(A.START_ROUND);
        case 'choose_start_abilities': {
          const entry = state.round.preparation.find(item => item.seat === seat);
          const choices = D.CHOOSABLE_ABILITY_IDS.filter(id => !entry.abilities.includes(id));
          const offset = (seed + seat + state.round.number) % choices.length;
          const abilities = choices.slice(offset).concat(choices.slice(0, offset)).slice(0, entry.freeChoices);
          return action(A.CHOOSE_START_ABILITIES, {abilities});
        }
      }
      break;
    }
  }
  throw new Error(`Der Bot erreicht eine unbekannte Entscheidung: ${JSON.stringify(state.turn)}`);
}

function frame(result) {
  return {state: JSON.stringify(result.state), events: JSON.stringify(result.events),
    rejected: result.rejected, reason: result.reason};
}

function nodeMatch(modeId, playerCount, seed) {
  const pool = D.CHOOSABLE_ABILITY_IDS;
  const setup = {modeId, players: Array.from({length: playerCount}, (_, seat) => ({seat,
    abilities: Array.from({length: D.LOCAL_MODES[modeId].startAbilityCount}, (_, slot) =>
      pool[(seed + seat * 5 + slot) % pool.length])
  })), startingSeat: seed % playerCount, rng: {algorithm: 'mulberry32', seed, state: seed, drawIndex: 0}};
  let state = createState(setup);
  const expected = [frame({state, events: []})], actions = [];
  while (!state.players.some(player => player.roundsWon >= winsRequired)) {
    assert.ok(actions.length < maxActions, `${modeId}/${playerCount}, Seed ${seed}: Match endet nicht`);
    const action = botAction(state, seed);
    const before = JSON.stringify(state);
    // Node verwendet den vorhandenen, state-basierten Mulberry32 im Reducer.
    // Damit ist das Orakel unabhängig vom neuen Server-Zufallsadapter.
    const result = reduce(state, action);
    assert.equal(result.rejected, undefined,
      `${modeId}/${playerCount}, Seed ${seed}, Aktion ${actions.length}: ${result.reason}`);
    assert.equal(JSON.stringify(state), before, 'Der Reducer verändert den Eingang nicht');
    const validation = validateState(result.state);
    assert.ok(validation.valid, JSON.stringify(validation.errors));
    actions.push(action); expected.push(frame(result)); state = result.state;
  }
  assert.ok(state.round.number >= 2 && state.round.result, 'Das Match endet erst nach mehreren vollständigen Runden');
  return {input: {modeId, playerCount, seed, setup, winsRequired, actions}, expected};
}

function firstDifference(node, deno, location = '$') {
  if (Object.is(node, deno)) return null;
  if (node === null || deno === null || typeof node !== 'object' || typeof deno !== 'object') {
    return {path: location, node, deno};
  }
  const nodeKeys = Object.keys(node), denoKeys = Object.keys(deno);
  if (JSON.stringify(nodeKeys) !== JSON.stringify(denoKeys)) {
    return {path: location + ' (Schlüssel/Reihenfolge)', node: nodeKeys, deno: denoKeys};
  }
  for (const key of nodeKeys) {
    const difference = firstDifference(node[key], deno[key], location + '.' + key);
    if (difference) return difference;
  }
  return null;
}

function compare(expected, actual) {
  for (const key of ['state', 'events']) {
    const value = JSON.stringify(actual[key]);
    if (expected[key] !== value) {
      return firstDifference(JSON.parse(expected[key]), actual[key], '$.' + key) ||
        {path: '$.' + key + ' (JSON-Darstellung)', node: expected[key], deno: value};
    }
  }
  for (const key of ['rejected', 'reason']) {
    if (expected[key] !== actual[key]) return {path: '$.' + key, node: expected[key], deno: actual[key]};
  }
  return null;
}

async function replay(row, fixtures, directory, runner) {
  const manifest = path.join(directory, 'manifest.json');
  await writeFile(manifest, JSON.stringify(fixtures.map(fixture => fixture.file)));
  const child = spawn(deno, ['run', '--check', '--no-config', '--no-lock', '--cached-only', '--no-prompt',
    '--allow-read=' + directory, runner, manifest], {cwd: root, stdio: ['ignore', 'pipe', 'pipe']});
  let stderr = '';
  child.stderr.setEncoding('utf8');
  child.stderr.on('data', chunk => {stderr = (stderr + chunk).slice(-32768);});
  const completion = new Promise((resolve, reject) => {
    child.once('error', reject);
    child.once('close', (code, signal) => resolve({code, signal}));
  });
  // Große 75-HP-Matches können pro Kombination über 100.000 Zustände liefern.
  // Das Zeitbudget wächst mit dem Umfang; ein hängender Prozess bleibt begrenzt.
  const actionCount = fixtures.reduce((sum, fixture) => sum + fixture.expected.length - 1, 0);
  const timeoutMs = Math.min(600000, Math.max(120000, actionCount * 5));
  let timedOut = false;
  const timeout = setTimeout(() => {timedOut = true; child.kill('SIGKILL');}, timeoutMs);
  const lines = createInterface({input: child.stdout});
  let duelIndex = 0, actionIndex = -1;
  try {
    for await (const line of lines) {
      const actual = JSON.parse(line), fixture = fixtures[duelIndex];
      assert.ok(fixture, 'Deno liefert zusätzliche Duelle');
      assert.equal(actual.duelIndex, duelIndex, 'Deno hält die Duellreihenfolge ein');
      assert.equal(actual.actionIndex, actionIndex, 'Deno liefert jeden Aktionszustand genau einmal');
      const difference = compare(fixture.expected[actionIndex + 1], actual);
      if (actionIndex >= 0) row.actions++;
      if (difference) {
        row.differences++;
        throw new Error(`Erste Abweichung: ${row.modeId}/${row.playerCount} Spieler, Seed ${fixture.seed}, ` +
          `Aktionsindex ${actionIndex} (0-basiert; -1 = Startzustand)\nDiff: ${JSON.stringify(difference, null, 2)}`);
      }
      actionIndex++;
      if (actionIndex === fixture.expected.length - 1) {row.duels++; duelIndex++; actionIndex = -1;}
    }
    const status = await completion;
    const context = `${row.modeId}/${row.playerCount}, Seed ${fixtures[duelIndex]?.seed ?? 'abgeschlossen'}, Aktionsindex ${actionIndex}`;
    assert.equal(status.code, 0, `Deno scheitert (${status.code ?? status.signal}) bei ${context}` +
      `${timedOut ? '; Zeitlimit ' + timeoutMs + ' ms erreicht' : ''}:\n${stderr}`);
    assert.equal(duelIndex, fixtures.length, 'Deno hat alle Duelle vollständig nachgespielt');
    assert.equal(actionIndex, -1, 'Deno hat keinen Aktionszustand ausgelassen');
  } finally {
    clearTimeout(timeout); lines.close();
    if (child.exitCode === null && child.signalCode === null) child.kill();
    await completion;
  }
}

const directory = await mkdtemp(path.join(tmpdir(), 'wd-engine-deno-'));
const runner = path.join(directory, 'replay.ts');
const adapter = pathToFileURL(path.join(root, 'supabase/functions/_shared/engine.ts')).href;
// Der Deno-Prozess enthält keinen Bot und kennt keine erwarteten Zustände.
const runnerSource = `import {createState, reduce, createServerRng, validateState} from ${JSON.stringify(adapter)};
const files: string[] = JSON.parse(await Deno.readTextFile(Deno.args[0]));
for (const [duelIndex, file] of files.entries()) {
  const input = JSON.parse(await Deno.readTextFile(file));
  let state = createState(input.setup);
  console.log(JSON.stringify({duelIndex, actionIndex: -1, state, events: []}));
  for (const [actionIndex, action] of input.actions.entries()) {
    const before = JSON.stringify(state);
    const result = reduce(state, action, createServerRng(state.rng));
    if (JSON.stringify(state) !== before) throw new Error('Deno verändert den Eingangszustand');
    console.log(JSON.stringify({duelIndex, actionIndex, ...result}));
    const validation = validateState(result.state);
    if (!validation.valid) throw new Error(JSON.stringify(validation.errors));
    state = result.state;
  }
  if (!state.round.result || state.round.number < 2 ||
      !state.players.some((player: {roundsWon: number}) => player.roundsWon >= input.winsRequired)) {
    throw new Error('Deno erreicht kein vollständiges Mehr-Runden-Matchende');
  }
}
`;

try {
  await writeFile(runner, runnerSource);
  for (const row of rows) {
    console.log(`Prüfe ${row.modeId}/${row.playerCount} Spieler: ${seeds.length} Seeds bis zum zweiten Rundensieg …`);
    const fixtures = [];
    for (const seed of seeds) {
      const match = nodeMatch(row.modeId, row.playerCount, seed);
      const file = path.join(directory, `duel-${seed}.json`);
      await writeFile(file, JSON.stringify(match.input));
      fixtures.push({seed, file, expected: match.expected});
    }
    await replay(row, fixtures, directory, runner);
  }
  assert.equal(rows.reduce((sum, row) => sum + row.duels, 0), 300, 'Alle 20 Kombinationen mit je 15 Seeds geprüft');
  console.log('Node/Deno-Parität: alle Zustände und Ereignisse nach jeder Aktion bytegleich.');
} catch (error) {
  console.error(error.stack || error.message);
  process.exitCode = 1;
} finally {
  console.log('\n| Kombination | Duelle | Aktionen | Abweichungen |');
  console.log('|---|---:|---:|---:|');
  for (const row of rows) console.log(`| ${row.modeId} × ${row.playerCount} | ${row.duels} | ${row.actions} | ${row.differences} |`);
  console.log(`| Gesamt | ${rows.reduce((sum, row) => sum + row.duels, 0)} | ` +
    `${rows.reduce((sum, row) => sum + row.actions, 0)} | ${rows.reduce((sum, row) => sum + row.differences, 0)} |`);
  await rm(directory, {recursive: true, force: true});
}
