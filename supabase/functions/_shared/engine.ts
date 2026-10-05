// Nur lokale Seiteneffekt-Imports: Reihenfolge entspricht der gemeinsamen Engine.
import './engine/01-rng.js';
import './engine/02-definitions.js';
import './engine/03-state.js';
import './engine/04-rules.js';
import './engine/05-reduce.js';

export type ModeId = 'classic' | 'endurance50' | 'overload75' | 'mayhem';
export type JsonValue = null | boolean | number | string | JsonValue[] | {[key: string]: JsonValue};
export interface Mulberry32State {
  algorithm: 'mulberry32'; seed: number; state: number; drawIndex: number;
}
export type RngState = Mulberry32State | {
  algorithm: 'external'; seed: null; state: null; drawIndex: number;
};
export interface DuelSetup {
  modeId: ModeId;
  players: {seat: number; abilities: number[]}[];
  startingSeat?: number;
  roundNumber?: number;
  rng?: RngState;
}
export interface Die {value: number | null; locked: boolean; selected: boolean}
export interface PlayerEffects {
  momentumStreak: number; lastStandUsed: boolean; lastStandCooldown: number;
  damageSinceLastOwnTurn: boolean; bloodRushPrimed: boolean; voluntaryHpPaidThisTurn: boolean;
  selfDamageSinceLastOwnTurn: boolean; underdogTurnActive: boolean; poisonTurns: number;
  poisonSourceSeat: number | null; healEffectCount: number; snakeEyesUsesThisTurn: number;
}
export interface DuelPlayer {
  seat: number; hp: number; maxHp: number; abilities: number[];
  bonusAbilityUnlocked: boolean; roundsWon: number; effects: PlayerEffects;
}
export type Phase = 'idle' | 'base_select' | 'base_ready' | 'gamble_attack' | 'gamble_retry_offer' |
  'gamble_retry' | 'perfect25' | 'perfect25_d4' | 'insurance' | 'attack_ready' | 'attack_after_roll' |
  'attack_target' | 'attack_continue' | 'high_stakes' | 'counterattack' | 'draft_pending' |
  'turn_done' | 'resolving' | 'finished' | 'round_preparation';
export type DecisionKind = 'roll_base' | 'select_base' | 'roll_attack' | 'resolve_attack' | 'gambling' |
  'gambling_retry_offer' | 'gambling_retry' | 'perfect25' | 'perfect25_d4' | 'insurance' | 'high_stakes' |
  'counterattack' | 'choose_attack_target' | 'choose_ability' | 'end_turn' | 'prepare_round' |
  'choose_start_abilities' | 'start_round';
export interface CounterContext {
  defenderSeat: number; attackerSeat: number; restoreHp: number | null;
  incomingDamage: number; lastStandTriggered: boolean; bloodRushActive: boolean;
}
export interface DraftEntry {seat: number; slot: number; trigger: 'hp' | 'kill'}
export interface RoundPreparation {
  seat: number; roll: number | null; abilities: number[]; freeChoices: number; ready: boolean;
}
export interface DuelState {
  ruleVersion: 'duel-1'; stateVersion: 1; modeId: ModeId; masteryLevel: 0 | 2;
  sequence: {action: number; event: number};
  players: DuelPlayer[];
  turn: {number: number; currentSeat: number; phase: Phase; decision: {kind: DecisionKind; seat: number} | null};
  dice: Die[];
  base: {
    rerollUsed: boolean; luckRerollIndex: number | null; luckRerollSecondUsed: boolean; luckRerollUses: number;
    loadedDiceUsed: boolean; loadedDiceUses: number; lastRollIndices: number[];
  };
  attack: {
    face: number | null; targetSeat: number | null; hits: number; damage: number;
    firstRoll: boolean; currentRollNewHits: number; rollCount: number; masteryRollCount: number;
    normalHits: number; exactFaceHits: number; wildcardHits: number; lastRollIndices: number[];
    powerUsed: boolean; powerUses: number; precisionUses: number; momentumBonus: number;
    bloodPriceNeighbors: number[]; bloodPricePaidThisRoll: number; bloodPriceWasPreActivatedThisRoll: boolean;
    bloodRushActive: boolean; doubleTapApplied: boolean; wildcardFace: number | null;
    wildcardSecondRollArmed: boolean; wildcardTriggered: boolean; masteryL2BonusesApplied: boolean;
    source: 'normal' | 'advance' | 'gambling' | 'perfect25'; baseTotal: number | null;
  };
  counter: {context: CounterContext | null; pending: CounterContext | null; dice: Die[]; hits: number; firstRoll: boolean};
  draft: {
    active: (DraftEntry & {choices: number[]}) | null; queue: DraftEntry[];
    continuation: 'finish_base' | 'finish_attack' | 'start_counter' | 'start_perfect25' |
      'resume_base_select' | 'resume_attack_ready' | 'resume_attack_continue' | 'resume_attack_after_roll' | null;
  };
  special: {
    gambling: {baseTotal: number | null; retryUsed: boolean; retryPending: boolean};
    perfect25: {baseTotal: number | null; pendingTotal: number | null};
    highStakes: {decisionMade: boolean; rawDamage: number | null};
    insurance: {total: number; rawDamage: number; afterMode: 'finish' | 'perfect25' | 'advance24'} | null;
  };
  round: {
    number: number; eliminationOrder: number[]; lastPlaceSeat: number | null; winnerSeat: number | null;
    result: {winnerSeat: number | null; reason: 'last_alive' | 'draw'} | null; preparation: RoundPreparation[];
  };
  rng: RngState;
}
export interface ActionMap {
  readonly ROLL_BASE: 'roll_base'; readonly TOGGLE_BASE_DIE: 'toggle_base_die'; readonly LOCK_SELECTED: 'lock_selected';
  readonly USE_LUCK_REROLL: 'use_luck_reroll'; readonly USE_LOADED_DICE: 'use_loaded_dice'; readonly USE_SNAKE_EYES: 'use_snake_eyes';
  readonly ROLL_INSURANCE: 'roll_insurance'; readonly USE_BLOOD_PRICE: 'use_blood_price';
  readonly CHOOSE_ATTACK_TARGET: 'choose_attack_target'; readonly ROLL_ATTACK: 'roll_attack'; readonly RESOLVE_ATTACK: 'resolve_attack';
  readonly USE_ATTACK_POWER: 'use_attack_power'; readonly CONTINUE_DOUBLE_TAP: 'continue_double_tap';
  readonly USE_BLOOD_RUSH_SELF_HARM: 'use_blood_rush_self_harm'; readonly ROLL_COUNTERATTACK: 'roll_counterattack';
  readonly ROLL_GAMBLING: 'roll_gambling'; readonly ACCEPT_GAMBLING_RETRY: 'accept_gambling_retry';
  readonly DECLINE_GAMBLING_RETRY: 'decline_gambling_retry'; readonly ROLL_PERFECT25: 'roll_perfect25';
  readonly ROLL_PERFECT25_D4: 'roll_perfect25_d4'; readonly ROLL_HIGH_STAKES: 'roll_high_stakes';
  readonly SKIP_HIGH_STAKES: 'skip_high_stakes'; readonly CHOOSE_ABILITY: 'choose_ability'; readonly END_TURN: 'end_turn';
  readonly PREPARE_ROUND: 'prepare_round'; readonly CHOOSE_START_ABILITIES: 'choose_start_abilities'; readonly START_ROUND: 'start_round';
}
export type ActionType = ActionMap[keyof ActionMap];
type PayloadAction = 'toggle_base_die' | 'choose_attack_target' | 'choose_ability' | 'choose_start_abilities';
export type DuelAction = {seat: number} & (
  {type: Exclude<ActionType, PayloadAction>} |
  {type: 'toggle_base_die'; index: number} |
  {type: 'choose_attack_target'; targetSeat: number} |
  {type: 'choose_ability'; abilityId: number} |
  {type: 'choose_start_abilities'; abilities: number[]}
);
export interface EngineEvent {id: string; type: string; [key: string]: JsonValue}
export interface ValidationResult {valid: boolean; errors: {path: string; reason: string}[]}
export type ReduceResult = {state: DuelState; events: EngineEvent[]} & (
  {rejected?: never; reason?: never} | {rejected: true; reason: string}
);
export interface ModeDefinition {
  readonly id: ModeId; readonly name: string; readonly startHp: number; readonly startAbilityCount: number;
  readonly bonusThreshold: number | null; readonly bonusSlot: number | null; readonly maxPlayers: number;
  readonly allowBots: boolean; readonly lastPlaceFreeChoices: number; readonly bonusOnKill?: boolean;
  readonly allMasteryLevel?: number;
}
export interface Definitions {
  readonly RULE_VERSION: 'duel-1'; readonly STATE_VERSION: 1; readonly START_HP: number;
  readonly DICE_COUNT: number; readonly SECOND_ABILITY_HP: number;
  readonly REAL_ABILITY_IDS: readonly number[]; readonly CHOOSABLE_ABILITY_IDS: readonly number[];
  readonly LOCAL_MODES: Readonly<Record<ModeId, ModeDefinition>>;
  readonly ABILITIES: Readonly<Record<number, {readonly name: string; readonly desc: string}>>;
}
export interface ServerRng {
  random(): number;
  /** Unabhängige Kopie des privaten, fortgeschriebenen Zufallszustands. */
  snapshot(): Mulberry32State;
}
interface EngineApi {
  createState(setup: DuelSetup): DuelState;
  validateState(state: unknown): ValidationResult;
  reduce(state: DuelState, action: DuelAction, rng?: ServerRng): ReduceResult;
  actions: ActionMap;
  definitions: Definitions;
}
// Die IIFEs registrieren ihre API ohne ES-Modul-Exporte auf globalThis.
const engine = (globalThis as unknown as {WDEngine: EngineApi}).WDEngine;
export const createState: EngineApi['createState'] = engine.createState;
export const validateState: EngineApi['validateState'] = engine.validateState;
export const actions: ActionMap = engine.actions;
export const definitions: Definitions = engine.definitions;

function uint32(value: unknown): value is number {
  return typeof value === 'number' && Number.isInteger(value) && value >= 0 && value <= 0xffffffff;
}

/** Pro Aufruf aus dem gespeicherten state.rng fortsetzen, niemals aus dem Seed neu beginnen. */
export function createServerRng(rngState: Readonly<RngState>): ServerRng {
  if (!rngState || rngState.algorithm !== 'mulberry32' || !uint32(rngState.seed) || !uint32(rngState.state) ||
      !Number.isSafeInteger(rngState.drawIndex) || rngState.drawIndex < 0) {
    throw new TypeError('Server-Zufall benötigt state.rng mit Mulberry32, uint32-Seed/-Zustand und sicherem Ziehungszähler');
  }
  const progress: Mulberry32State = {algorithm: 'mulberry32', seed: rngState.seed,
    state: rngState.state, drawIndex: rngState.drawIndex};
  return Object.freeze({
    random(): number {
      if (progress.drawIndex === Number.MAX_SAFE_INTEGER) throw new RangeError('RNG-Ziehungszähler ist ausgeschöpft');
      progress.state = (progress.state + 0x6d2b79f5) >>> 0;
      let mixed = progress.state;
      mixed = Math.imul(mixed ^ (mixed >>> 15), mixed | 1);
      mixed ^= mixed + Math.imul(mixed ^ (mixed >>> 7), mixed | 61);
      progress.drawIndex++;
      return ((mixed ^ (mixed >>> 14)) >>> 0) / 4294967296;
    },
    snapshot(): Mulberry32State {return {...progress};}
  });
}

/** Der gemeinsame Reducer klont den Eingang und zählt injizierte Ziehungen selbst. */
export function reduce(state: DuelState, action: DuelAction, rng?: ServerRng): ReduceResult {
  if (!rng) return engine.reduce(state, action);
  const before = rng.snapshot();
  if (before.algorithm !== state.rng.algorithm || before.seed !== state.rng.seed ||
      before.state !== state.rng.state || before.drawIndex !== state.rng.drawIndex) {
    throw new TypeError('Der Server-Zufallsgeber gehört nicht zum gespeicherten state.rng');
  }
  const result = engine.reduce(state, action, rng);
  if (!result.rejected) {
    const after = rng.snapshot();
    if (after.drawIndex !== result.state.rng.drawIndex) throw new Error('RNG-Ziehungszähler von Adapter und Reducer weichen ab');
    // Nur den Generatorzustand ergänzen: Der Reducer hat drawIndex bereits erhöht.
    // So bleiben Eingang, Schlüsselreihenfolge und Ablehnungen unverändert.
    result.state.rng.state = after.state;
  }
  return result;
}
