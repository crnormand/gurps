import { BaseAction } from '@module/action/base-action.js'
import { GurpsActor } from '@module/actor/actor.js'
import { CharacterModel } from '@module/actor/data/character.js'
import { GurpsActorV2 } from '@module/actor/gurps-actor.js'
import { ActorV1Model } from '@module/actor/legacy/actorv1-interface.js'
import { GurpsCombatant } from '@module/combat/combatant.js'
import { DamageChat } from '@module/damage/damagechat.js'
import { GurpsActiveEffect } from '@module/effects/active-effect.js'
import { EquipmentModel } from '@module/item/data/equipment.js'
import { SkillModel } from '@module/item/data/skill.js'
import { SpellModel } from '@module/item/data/spell.js'
import { TraitModel } from '@module/item/data/trait.js'
import { GurpsItemV2 } from '@module/item/gurps-item.js'
import { Equipment, Feature, Skill, Spell } from '@module/item/legacy/itemv1-interface.js'
import { ResourceTrackerManager } from '@module/resource-tracker/resource-tracker-manager.js'
import { ResourceTrackerTemplate } from '@module/resource-tracker/resource-tracker.js'
import { TaggedModifiersSettings } from '@module/tagged-modifiers/index.js'
import { GurpsToken } from '@module/token/gurps-token.js'
import { AnyMutableObject, AnyObject } from 'fvtt-types/utils'


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

declare module 'fvtt-types/configuration' {
  interface DocumentClassConfig {
    Actor: typeof GurpsActorV2<Actor.SubType>
    Item: typeof GurpsItemV2<Item.SubType>
    Combatant: typeof GurpsCombatant
    ActiveEffect: typeof GurpsActiveEffect
  }

  /* ---------------------------------------- */

  interface ConfiguredItem<SubType extends Item.SubType> {
    document: GurpsItemV2<SubType>
  }

  /* ---------------------------------------- */

  interface ConfiguredActor<SubType extends Actor.SubType> {
    document: GurpsActorV2<SubType>
  }

  /* ---------------------------------------- */

  interface FlagConfig {
    ActiveEffect: {
      gurps: GurpsEffectFlags
    }
    ChatMessage: {
      gurps: {
        transfer: AnyObject
      }
    }
  }

  /* ---------------------------------------- */

  interface DataModelConfig {
    Actor: {
      character: ActorV1Model
      characterV2: typeof CharacterModel
      enemy: typeof CharacterModel
    }
    Item: {
      equipment: Equipment
      feature: Feature
      skill: Skill
      spell: Spell
      equipmentV2: typeof EquipmentModel
      featureV2: typeof TraitModel
      skillV2: typeof SkillModel
      spellV2: typeof SpellModel
    }
  }

  /* ---------------------------------------- */

  interface PlaceableObjectClassConfig {
    Token: typeof GurpsToken
  }

  /* ---------------------------------------- */

  namespace Hooks {
    interface HookConfig {
      dropCanvasData: (canvas: Canvas, dropData: any) => void
      applyActiveEffect: (actor: Actor.Implementation, change: any, options: any, user: User.Implementation) => void
    }
  }

  /* ---------------------------------------- */

  interface SettingConfig {
    'gurps.bucket-position': 'left' | 'right'
    'gurps.damage.apply-divisor': foundry.data.fields.BooleanField
    'gurps.damage.blunt-trauma': foundry.data.fields.BooleanField
    'gurps.damage.body-hits': foundry.data.fields.BooleanField
    'gurps.damage.default-action': 'apply' | 'quiet' | 'target'
    'gurps.damage.default-hitlocation': 'Torso' | 'Random'
    'gurps.damage.location-modifiers': foundry.data.fields.BooleanField
    'gurps.damage.only-gms-open-add': foundry.data.fields.BooleanField
    'gurps.damage.simple-add': foundry.data.fields.BooleanField
    'gurps.damage.show-the-math': foundry.data.fields.BooleanField
    'gurps.importer.auto-ignore-qty': foundry.data.fields.BooleanField
    'gurps.importer.display-preserve-qty-flag': foundry.data.fields.BooleanField
    'gurps.importer.import-extended-values-gcs': foundry.data.fields.BooleanField
    'gurps.importer.import-file-encoding': foundry.data.fields.StringField<{
      choices: { Latin1: string; UTF8: string }
    }>
    'gurps.importer.only-trusted-import': foundry.data.fields.BooleanField
    'gurps.importer.overwrite-bodyplan': foundry.data.fields.StringField<{
      choices: { overwrite: string; keep: string; ask: string }
    }>
    'gurps.importer.overwrite-hp-fp': foundry.data.fields.StringField<{
      choices: { overwrite: string; keep: string; ask: string }
    }>
    'gurps.importer.overwrite-name': foundry.data.fields.BooleanField
    'gurps.importer.overwrite-portraits': foundry.data.fields.BooleanField<{ initial: true }>
    'gurps.importer.use-browser-importer': foundry.data.fields.BooleanField
    'gurps.modify-dice-plus-adds': boolean
    'gurps.pdf.basicset': 'Combined' | 'Separate'
    'gurps.pdf.open-first': boolean
    'gurps.portrait-path': 'global' | 'world'
    'gurps.rangeStrategy': 'Standard' | 'Simplified' | 'TenPenalties'
    'gurps.resource-tracker.manager': new (options?: any) => ResourceTrackerManager
    'gurps.resource-tracker.templates': Record<string, ResourceTrackerTemplate>
    'gurps.show-confirmation-roll-dialog': boolean
    'gurps.use-quick-rolls': AnyMutableObject
    'gurps.portrait-hp-tinting': boolean

    // NOTE: These settings will be deprecated in the future, but their updated equivalents do not yet exist.
    'gurps.allow-after-max-actions': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-roll-based-on-maneuver': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-rolls-before-combat-start': 'Allow' | 'Warn' | 'Forbid'
    'gurps.allow-targeted-rolls': 'Allow' | 'Warn' | 'Forbid'
    'gurps.automatic-encumbrance': boolean
    'gurps.automatic-onethird': boolean
    'gurps.check-equipped': boolean
    'gurps.convert-ranged': boolean
    'gurps.maneuver-detail': 'Full' | 'NoFeint' | 'General'
    'gurps.maneuver-updates-move': boolean
    'gurps.maneuver-visibility': 'NoOne' | 'GMAndOwner' | 'Everyone'
    'gurps.show-chat-reeling-tired': boolean
    'gurps.use-max-actions': 'Disable' | 'AllCombatant' | 'AllTokens'
    'gurps.use-quintessence': boolean
    'gurps.use-tagged-modifiers': TaggedModifiersSettings

    'gurps.use-foundry-items': boolean
    // TODO: Deprecated settings.
    'gurps.auto-ignore-qty': boolean
    'gurps.basicsetpdf': string
    'gurps.block-import': boolean
    'gurps.combat-apply-divisor': boolean
    'gurps.combat-blunt-trauma': boolean
    'gurps.combat-body-hits': boolean
    'gurps.combat-location-modifiers': boolean
    'gurps.combat-simple-damage': boolean
    'gurps.default-add-action': 'apply' | 'quiet' | 'target'
    'gurps.default-hitlocation': 'Torso' | 'Random'
    'gurps.ignore_import_name': boolean
    'gurps.ignoreImportQty': boolean
    'gurps.import-file-encoding': 0 | 1
    'gurps.import_bodyplan': number
    'gurps.import_extended_values_gcs': boolean
    'gurps.import_hp_fp': number
    'gurps.only-gms-open-add': boolean
    'gurps.overwrite-portraitsk': boolean
    'gurps.pdf-open-first': boolean
    'gurps.show-the-math': boolean
    'gurps.tracker-templates': new (options?: any) => Record<string, ResourceTrackerTemplate>
    'gurps.use-browser-importer': boolean
    'gurps.use-size-modifier-difference-in-melee': boolean
    'gurps.automatic-encumbrance': boolean
  }
}

// declare module '*/miscellaneous-settings.js' {
//   export const SYSTEM_NAME: 'gurps'
//   export const SETTING_USE_FOUNDRY_ITEMS: 'use-foundry-items'
//   export const SETTING_PORTRAIT_HP_TINTING: 'portrait-hp-tinting'
// }
//
// declare namespace foundry.applications.api {
//   class DialogV2 {
//     constructor(config: DialogV2Config)
//     render(options?: { force?: boolean }): Promise<DialogV2>
//     element: HTMLElement
//   }
// }
