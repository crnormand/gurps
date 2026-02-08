import { BaseAction } from '@module/action/base-action.js'
import { DamageChat } from '@module/damage/damagechat.js'

export {}

declare global {
  interface GURPSGlobal {
    SYSTEM_NAME: 'gurps'
    modules: Record<string, GurpsModule>
    LastActor: Actor.Implementation | null
    StatusEffect: {
      lookup(id: string): any
    }
    SavedStatusEffects: typeof CONFIG.statusEffects
    StatusEffectStanding: 'standing'
    StatusEffectStandingLabel: 'GURPS.status.Standing'
    decode<T = unknown>(actor: GurpsActor, path: string): T
    put<T>(list: Record<string, T>, obj: T, index?: number = -1): string
    parselink(input: string): { text: string; action?: GurpsAction }
    removeKey(actor: GurpsActor, key: string): void
    insertBeforeKey(actor: Actor.Implementation, path: string, newobj: AnyObject): Promise<void>
    findAdDisad(actor: Actor.Implementation, adName: string): Feature['fea'] | undefined
    readTextFromFile(file: File): Promise<string>
    performAction(
      action: GurpsAction,
      actor: Actor | GurpsActor | null,
      event?: Event | null,
      targets?: string[]
    ): Promise<any>
    stopActions: boolean
    ModifierBucket: {
      setTempRangeMod(mod: number): void
      addTempRangeMod(): void
      addModifier(mod: string, label: string, options?: { situation?: string }, tagged?: boolean): void
      currentSum(): number
      clear(): Promise<void>
      refreshPosition(): void
      render(): Promise<void>
    }
    DamageTables: {
      translate(damageType: string): string
      woundModifiers: Record<
        string,
        { label?: string; icon?: string; color?: string; multiplier?: number; resource?: boolean }
      >
      damageTypeMap: Record<string, string>
    }
    SSRT: {
      getModifier(yards: number): number
    }
    rangeObject: {
      ranges: Array<{ modifier: number; max: number; penalty: number }>
    }
    Maneuvers: {
      get(id: string): { icon?: string; label: string; move: string | null } | undefined
      getAll(): Record<string, { id: string; icon: string; label: string }>
    }
    ApplyDamageDialog: new (actor: GurpsActor, damageData: DamageData[], options?: object) => Application
    DamageChat: typeof DamageChat
    resolveDamageRoll: (
      event: Event,
      actor: GurpsActor,
      otf: string,
      overridetxt: string | null,
      isGM: boolean,
      isOtf?: boolean
    ) => Promise<void>
    SJGProductMappings: Record<string, string>
    CONFIG: {
      Action: Record<
        string,
        {
          label: string
          documentClass: typeof BaseAction
        }
      >
      // HACK: to get rid of later. just used for TypedPseudoDocument.TYPES at the moment
      [key: string]: unknown
    }
  }

  var GURPS: GURPSGlobal

  /* ---------------------------------------- */

  // @deprecated TODO: REMOVE. Legacy
  interface ManeuverData {
    name: string
    label: string
    move: string | null
    defense?: string
    fullturn?: boolean
    icon: string
    alt?: string | null
    introducedBy?: string | null
  }

  /* ---------------------------------------- */

  interface Modifier {
    mod: string
    modint: number
    desc: string
    plus: boolean
    tagged: boolean
  }

  /* ---------------------------------------- */

  interface GurpsAction {
    type: string
    sourceId?: string
    orig?: string
    calcOnly?: boolean
    // NOTE: not sure if this is accurate
    action?: GurpsAction
    next?: GurpsAction
    [key: string]: unknown
  }

  /* ---------------------------------------- */

  interface DamageData {
    attacker?: string
    dice?: string
    damage?: number
    damageType?: string
    armorDivisor?: number
    [key: string]: unknown
  }

  /* ---------------------------------------- */

  interface DialogV2Config {
    window?: { title?: string; resizable?: boolean }
    content?: string
    buttons?: Array<{
      action?: string
      label: string
      icon?: string
      callback?: (event: Event, button: HTMLButtonElement) => void
    }>
  }

  /* ---------------------------------------- */

  interface TotalPoints {
    race?: string | number
    ads?: string | number
    attributes?: string | number
    skills?: string | number
    spells?: string | number
    disads?: string | number
    quirks?: string | number
  }

  /* ---------------------------------------- */

  interface EntityComponentBase {
    name?: string
    notes?: string
    uuid?: string
    contains?: NestedEntityRecord
    collapsed?: NestedEntityRecord
  }

  /* ---------------------------------------- */

  interface NestedEntityRecord {
    [key: string]: EntityComponentBase
  }

  /* ---------------------------------------- */

  interface ModifierComponent extends EntityComponentBase {
    situation?: string
  }

  /* ---------------------------------------- */

  interface InlineEditConfig {
    displaySelector: string
    containerSelector: string
    inputSelector: string
    editingClass?: string
    fieldType?: 'name' | 'tag'
    onBlur?: (input: HTMLInputElement) => void
  }

  /* ---------------------------------------- */

  interface RowExpandConfig {
    rowSelector: string
    excludeSelectors?: string[]
    expandedClass?: string
  }

  /* ---------------------------------------- */

  interface SectionCollapseConfig {
    headerSelector: string
    excludeSelectors?: string[]
    collapsedClass?: string
  }

  /* ---------------------------------------- */

  interface ResourceResetConfig {
    selector: string
    resourcePath: string
    maxPath: string
  }

  /* ---------------------------------------- */

  interface ContainerCollapseConfig {
    tableSelector: string
    rowSelector: string
    excludeSelectors?: string[]
  }

  /* ---------------------------------------- */

  interface DropdownConfig {
    dropdownSelector: string
    toggleSelector: string
    optionSelector: string
    onSelect: (value: string) => Promise<void> | void
  }

  /* ---------------------------------------- */

  type EntityConstructorArgs = string[]

  /* ---------------------------------------- */

  interface EntityComponentClass {
    new (name?: string, ...args: never[]): EntityComponentBase
  }

  /* ---------------------------------------- */

  interface EntityConfiguration {
    entityName: string
    path: string
    EntityClass: EntityComponentClass
    editMethod: string
    localeKey: string
    displayProperty?: string
    createArgs?: () => EntityConstructorArgs
  }

  /* ---------------------------------------- */

  interface ModifierConfiguration {
    isReaction: boolean
  }

  /* ---------------------------------------- */

  type EntityConfigWithMethod = Omit<EntityConfiguration, 'editMethod' | 'createArgs'> & {
    editMethod: (actor: Actor.Implementation, path: string, obj: EntityComponentBase) => Promise<void>
    createArgs?: EntityConstructorArgs
  }

  /* ---------------------------------------- */

  interface NoteComponent extends EntityComponentBase {
    notes?: string
    title?: string
  }

  /* ---------------------------------------- */

  interface EquipmentComponent extends EntityComponentBase {
    save?: boolean
    itemid?: string
  }

  /* ---------------------------------------- */

  interface EquipmentInstance extends EquipmentComponent {
    toItemData(actor: Actor.Implementation, path: string): Record<string, string | number | boolean | object>
    _getGGAId(config: { name: string; type: string; generator: string }): string
  }

  /* ---------------------------------------- */

  interface GurpsActorSheetEditMethods {
    editEquipment(actor: Actor.Implementation, path: string, obj: EntityComponentBase): Promise<void>
    editNotes(actor: Actor.Implementation, path: string, obj: EntityComponentBase): Promise<void>
    editModifier(
      actor: Actor.Implementation,
      path: string,
      obj: EntityComponentBase,
      isReaction: boolean
    ): Promise<void>
  }

  /* ---------------------------------------- */

  interface GurpsActorSystem {
    HP?: { value: number; max: number }
    FP?: { value: number; max: number }
    additionalresources?: {
      qnotes?: string
    }
    skills?: NestedEntityRecord
    ads?: NestedEntityRecord
    melee?: NestedEntityRecord
    ranged?: NestedEntityRecord
    reactions?: Record<string, ModifierComponent>
    conditionalmods?: Record<string, ModifierComponent>
    totalpoints?: TotalPoints
    equipment?: {
      carried?: Record<string, EquipmentComponent>
      other?: Record<string, EquipmentComponent>
    }
    notes?: Record<string, NoteComponent>
  }

  /* ---------------------------------------- */

  interface GurpsEffectFlags {
    effect?: {
      type?: string
      pdfref?: string
    }
    name?: string
    alt?: string
    move?: string
    defense?: string
    fullturn?: boolean
    duration?: { delaySeconds: number | null }
    endCondition?: string
    terminateActions?: { type: string; args: string }[]
    statusId?: string
  }
}
