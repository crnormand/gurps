import { AnyMutableObject } from 'fvtt-types/utils'
import { ResourceTrackerTemplate } from 'module/resource-tracker/types.ts'
import { GurpsActor } from './module/actor/actor.js'
import { GurpsCombatant } from './module/combat/combatant.ts'
import { GurpsItem } from './module/item.js'
import { GurpsToken } from './module/token/gurps-token.ts'

export {  }

declare global {
  interface GurpsAction {
    type: string
    sourceId?: string
    orig?: string
    calcOnly?: boolean
    next?: GurpsAction
    [key: string]: unknown
  }

  interface DamageData {
    attacker?: string
    dice?: string
    damage?: number
    damageType?: string
    armorDivisor?: number
    [key: string]: unknown
  }

  interface GURPSGlobal {
    SYSTEM_NAME: 'gurps'
    decode<T = unknown>(actor: GurpsActor, path: string): T
    put<T>(list: Record<string, T>, obj: T): string
    removeKey(actor: GurpsActor, key: string): void
    performAction(
      action: GurpsAction,
      actor: Actor | GurpsActor | null,
      event?: Event | null,
      targets?: string[]
    ): Promise<boolean>
    stopActions: boolean

    ModifierBucket: {
      setTempRangeMod(mod: number): void
      addTempRangeMod(): void
      currentSum(): number
      clear(): Promise<void>
      refreshPosition(): void
    }

    DamageTables: {
      translate(damageType: string): string
      woundModifiers: Record<string, { label?: string; icon?: string; color?: string; multiplier?: number; resource?: boolean }>
      damageTypeMap: Record<string, string>
    }

    SSRT: {
      getModifier(yards: number): number
    }

    rangeObject: {
      ranges: Array<{ modifier: number; max: number; penalty: number }>
    }

    Maneuvers: {
      get(id: string): { icon?: string } | undefined
      getAll(): Record<string, { id: string; icon: string; label: string }>
    }

    ApplyDamageDialog: new (actor: GurpsActor, damageData: DamageData[], options?: object) => Application
    DamageChat: {
      _renderDamageChat(app: { data: { flags: { transfer: string } }; flags: { gurps: { transfer: object } } }, html: JQuery, msg: object): Promise<void>
    }
    resolveDamageRoll: (
      event: Event,
      actor: GurpsActor,
      otf: string,
      overridetxt: string | null,
      isGM: boolean,
      isOtf?: boolean
    ) => Promise<void>
    SJGProductMappings: Record<string, string>
  }

  var GURPS: GURPSGlobal

  interface TotalPoints {
    race?: string | number
    ads?: string | number
    attributes?: string | number
    skills?: string | number
    spells?: string | number
    disads?: string | number
    quirks?: string | number
  }

  interface EntityComponentBase {
    name?: string
    notes?: string
    uuid?: string
    contains?: NestedEntityRecord
    collapsed?: NestedEntityRecord
  }

  interface NestedEntityRecord {
    [key: string]: EntityComponentBase
  }

  interface ModifierComponent extends EntityComponentBase {
    situation?: string
  }

  interface InlineEditConfig {
    displaySelector: string
    containerSelector: string
    inputSelector: string
    editingClass?: string
    fieldType?: 'name' | 'tag'
    onBlur?: (input: HTMLInputElement) => void
  }

  interface RowExpandConfig {
    rowSelector: string
    excludeSelectors?: string[]
    expandedClass?: string
  }

  interface SectionCollapseConfig {
    headerSelector: string
    excludeSelectors?: string[]
    collapsedClass?: string
  }

  interface ResourceResetConfig {
    selector: string
    resourcePath: string
    maxPath: string
  }

  interface DropdownConfig {
    dropdownSelector: string
    toggleSelector: string
    optionSelector: string
    onSelect: (value: string) => Promise<void> | void
  }

  type EntityConstructorArgs = string[]

  interface EntityComponentClass {
    new(name?: string, ...args: never[]): EntityComponentBase
  }

  interface EntityConfiguration {
    entityName: string
    path: string
    EntityClass: EntityComponentClass
    editMethod: string
    localeKey: string
    displayProperty?: string
    createArgs?: () => EntityConstructorArgs
  }

  interface ModifierConfiguration {
    isReaction: boolean
  }

  type EntityConfigWithMethod = Omit<EntityConfiguration, 'editMethod' | 'createArgs'> & {
    editMethod: (actor: GurpsActor, path: string, obj: EntityComponentBase) => Promise<void>
    createArgs?: EntityConstructorArgs
  }

  interface DocumentClassConfig {
    Actor: typeof GurpsActor
    Item: typeof GurpsItem
    Combatant: typeof GurpsCombatant
  }

  interface PlaceableObjectClassConfig {
    Token: typeof GurpsToken
  }

  interface SettingConfig {
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
    'gurps.bucket-position': 'left' | 'right'
    'gurps.resource-tracker.manager': new (options?: any) => ResourceTracker.TemplateManager
    'gurps.resource-tracker.templates': Record<string, ResourceTrackerTemplate>
    'gurps.use-quick-rolls': AnyMutableObject
    'gurps.show-confirmation-roll-dialog': boolean
    'gurps.modify-dice-plus-adds': boolean
    'gurps.pdf.basicset': String
    'gurps.pdf.open-first': boolean
    'gurps.use-foundry-items': boolean
    // TODO: Deprecated settings.
    'gurps.tracker-templates': new (options?: any) => Record<string, ResourceTrackerTemplate>
    'gurps.basicsetpdf': String
    'gurps.pdf-open-first': boolean
    'gurps.use-size-modifier-difference-in-melee': boolean
    'gurps.portrait-hp-tinting': boolean
  }

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

  interface NoteComponent extends EntityComponentBase {
    notes?: string
    title?: string
  }

  interface EquipmentComponent extends EntityComponentBase {
    save?: boolean
    itemid?: string
  }

  interface EquipmentInstance extends EquipmentComponent {
    toItemData(actor: GurpsActor, path: string): Record<string, string | number | boolean | object>
    _getGGAId(config: { name: string; type: string; generator: string }): string
  }

  interface GurpsActorSheetEditMethods {
    editEquipment(actor: GurpsActor, path: string, obj: EntityComponentBase): Promise<void>
    editNotes(actor: GurpsActor, path: string, obj: EntityComponentBase): Promise<void>
    editModifier(actor: GurpsActor, path: string, obj: EntityComponentBase, isReaction: boolean): Promise<void>
  }

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
}

declare module '*/miscellaneous-settings.js' {
  export const SYSTEM_NAME: 'gurps'
  export const SETTING_USE_FOUNDRY_ITEMS: 'use-foundry-items'
  export const SETTING_PORTRAIT_HP_TINTING: 'portrait-hp-tinting'
}

declare namespace foundry.applications.api {
  class DialogV2 {
    constructor(config: DialogV2Config)
    render(options?: { force?: boolean }): Promise<DialogV2>
    element: HTMLElement
  }
}
