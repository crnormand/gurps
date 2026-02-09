import { TrackerInstance } from '@module/resource-tracker/resource-tracker.js'
import { AnyObject } from 'fvtt-types/utils'

import { Advantage, Equipment, HitLocationEntry, Melee, Ranged, Skill, Spell } from '../actor-components.js'
import { CanRollResult, CheckInfo } from '../types.js'

import { HitLocationEntryV1 } from './hit-location-entryv1.js'

interface HitLocationRecord {
  id: string
  roll: string
  penalty: number
  role?: string
}

interface DamageAccumulator {
  count: number
  costs?: string
  damagetype: string
  extdamagetype?: string
  formula: string
  orig: string
  type: 'damage'
}

interface RollInfo {
  name: string
  uuid: string | null
  itemId: string | null
  fromItem: string | null
  pageRef: string | null
}

interface ActorV1Interface {
  // Properties
  _additionalResources: Record<string, any>
  _hitLocationRolls: HitLocationEntry[] | Record<string, Record<string, HitLocationRecord>>
  defaultHitLocation: string
  displayname: string
  hitLocationByWhere: Record<string, HitLocationEntryV1>
  hitLocationsWithDR: HitLocationEntry[]
  temporaryEffects: any[]
  trackersByName: Record<string, any>
  usingQuintessence: boolean

  // Methods
  _findEqtkeyForId(key: string, id: string): string | undefined
  _findSysKeyForId(key: string, id: string | undefined, sysKey: string, include: boolean): string | undefined
  _forceRender(): void
  _removeItemAdditions(itemId: string): Promise<void>
  _sanityCheckItemSettings(component: AnyObject): Promise<boolean>
  _updateItemFromForm(item: Item.OfType<'base' | 'equipment' | 'feature' | 'skill' | 'spell'>): Promise<void>
  accumulateDamageRoll(action: any): Promise<void>
  addNewItemData(itemData: Record<string, any>, targetkey: string | null): void
  addTaggedRollModifiers(
    chatthing: string,
    optionalArgs: Record<string, any>,
    attack: Record<string, any>
  ): Promise<boolean>
  addTracker(): Promise<void>
  applyDamageAccumulator(index: number): Promise<void>
  applyItemModEffects(commit: Record<string, any>, append?: boolean): void
  applyTrackerTemplate(path: string, template: Record<string, any>): Promise<void>
  canConsumeAction(action: Record<string, any>, chatThing: string, actorComponent?: AnyObject): boolean
  canRoll(
    action: Record<string, any>,
    token: Token.Implementation,
    chatThing?: string,
    actorComponent?: AnyObject
  ): Promise<CanRollResult>
  changeDR(
    drFormula: string,
    drLocations: string[]
  ): Promise<{
    changed: boolean
    msg?: string
    info?: string | undefined
    warn?: string | undefined
  }>
  clearDamageAccumulator(index: number): Promise<void>
  decrementDamageAccumulator(index: number): Promise<void>
  deleteEntry(path: string, options?: { refreshDR?: boolean }): Promise<unknown>
  findAdvantage(name: string): Advantage | undefined
  findEquipmentByName(pattern: string, otherFirst?: boolean): [Item.Implementation | null, string | null] | null
  findUsingAction(action: Record<string, any>, chatthing: string, formula: string, thing: string): RollInfo
  getChecks(type: string): {
    data: CheckInfo[] | Record<string, CheckInfo> | Record<string, CheckInfo[]>
    size: number
  }
  getCurrentDodge(): number
  getDRTooltip(locationId: string): string
  getEquippedBlock(): string | number
  getEquippedParry(): string | number
  getOwners(): User.Implementation[]
  getTorsoDr(): Record<string, any> | undefined
  handleDamageDrop(data: Record<string, any>): void
  handleEquipmentDrop(data: Record<string, any>): Promise<boolean>
  handleItemDrop(data: Record<string, any>): Promise<void>
  incrementDamageAccumulator(index: number): Promise<void>
  internalUpdate(changes: Actor.UpdateData, context: Record<string, any>): Promise<this | undefined>
  isEffectActive(effect: ActiveEffect.Implementation): boolean
  isEmptyActor(): boolean
  moveEquipment(sourcekey: string, targetkey: string, shiftkey: boolean): Promise<void>
  openSheet(sheet: Application): void
  postImport(): Promise<void>
  refreshDR(): Promise<void>
  removeModEffectFor(reference: string): Promise<void>
  removeTracker(path: string): Promise<void>
  reorderItem(sourcekey: string, targetkey: string, object: Record<string, any>, isSourceFirst: boolean): Promise<void>
  replaceManeuver(maneuverText: string): Promise<void>
  replacePosture(changeData: any): Promise<void>
  runOTF(otf: string): Promise<void>
  sendChatMessage(message: string): void
  setMoveDefault(value: string): Promise<void>
  toggleExpand(path: string, expanded: boolean): Promise<void>
  toggleStatusEffect(
    id: string,
    options: { active?: boolean; overlay?: boolean }
  ): Promise<ActiveEffect.Implementation | boolean | undefined>
  updateEqtCount(key: string, newCount: number): Promise<void>
  updateItem(item: Item): Promise<void>
  updateItemAdditionsBasedOn(equipment: Equipment, targetPath: string): Promise<void>
  updateParentOf(sourcekey: string, updateParentUuid: boolean): Promise<void>
}

interface Attribute {
  import: number
  value: number
  points: number
  dtype: string
}

interface AttributePool {
  value: number
  min: number
  max: number
  points: number
}

interface EncumbranceLevel {
  key: string
  level: number | string
  dodge: number
  weight: number
  move: number
  current: boolean
  currentmove: number
  currentdodge: number | string
  currentsprint: number
  currentmovedisplay: string
}

interface Modifier {
  description: string
  value: number
}

interface Trait {
  value: number | string
  points: number
}

interface MoveMode {
  mode: string
  basic: number
  enhanced?: number
  default: boolean
}

interface ActorV1Model {
  attributes: {
    ST: Attribute
    DX: Attribute
    IQ: Attribute
    HT: Attribute
    WILL: Attribute
    PER: Attribute
    QN: Attribute
  }
  HP: AttributePool
  FP: AttributePool
  QP: AttributePool
  dodge: {
    value: number
    enc_level: number
  }
  basicmove: Trait
  basicspeed: Trait
  parry: number
  currentmove: number
  thrust: string
  swing: string
  frightcheck: number
  hearing: number
  tastesmell: number
  vision: number
  touch: number
  ads: Record<string, Advantage>
  languages: Record<string, any>
  skills: Record<string, Skill>
  spells: Record<string, Spell>
  money: Record<string, any>
  traits: {
    title: string
    race: string
    height: string
    weight: string
    age: string
    birthday: string
    religion: string
    gender: string
    eyes: string
    hair: string
    skin: string
    hand: string
    sizemod: string
    techlevel: string
    createdon: string
    modifiedon: string
    player: string
  }
  totalpoints: {
    attributes: number
    ads: number
    disads: number
    quirks: number
    skills: number
    spells: number
    total: number
    unspent: number
    race: number
  }
  melee: Record<string, Melee>
  ranged: Record<string, Ranged>
  hitlocations: Record<string, HitLocationEntryV1>
  encumbrance: Record<string, EncumbranceLevel>
  notes: Record<string, any>
  equipment: {
    carried: Record<string, Equipment>
    other: Record<string, Equipment>
  }
  liftingmoving: {
    basiclift: string
    carryonback: string
    onehandedlift: string
    runningshove: string
    shiftslightly: string
    shove: string
    twohandedlift: string
  }
  conditionalmods: Record<string, Modifier>
  reactions: Record<string, Modifier>
  additionalresources: {
    qnotes?: string
    bodyplan: string
    tracker: Record<string, TrackerInstance>
  }
  conditions: {
    reeling: boolean
    exhausted: boolean
    maneuver: string | undefined
    posture: string
    move: number | string
    damageAccumulators?: DamageAccumulator[]
    actions?: {
      maxActions: number
      maxBlocks: number
    }
    self: {
      modifiers: string[]
    }
    target: {
      modifiers: string[]
    }
  }
  conditionalinjury: {
    RT: Trait
    injury: {
      severity: string
      daystoheal: number
    }
  }
  defenses: {
    parry: Record<string, any>
    block: Record<string, any>
    dodge: Record<string, any>
  }
  currentflight: number
  currentdodge: number | string
  currentsprint: number
  equippedblock: number | string
  equippedparry: number | string
  move: Record<string, MoveMode>
  equippedparryisfencing: boolean
}

export {
  type DamageAccumulator,
  type HitLocationRecord,
  type ActorV1Interface,
  type ActorV1Model,
  type EncumbranceLevel,
  type MoveMode,
}
