import { ActionModule as ModuleAction } from '@module/action/index.js'
import { Actor as ModuleActor } from '@module/actor/index.js'
import { Canvas as ModuleCanvas } from '@module/canvas/index.js'
import { Combat as ModuleCombat } from '@module/combat/index.js'
import { CombatTracker as ModuleCombatTracker } from '@module/combat-tracker/index.js'
import { Damage as ModuleDamage } from '@module/damage/index.js'
import { Dev as ModuleDev } from '@module/dev/index.js'
import { Importer as ModuleImporter } from '@module/importer/index.js'
import { Item as ModuleItem } from '@module/item/index.js'
import { Pdf as ModulePdf } from '@module/pdf/index.js'
import { PseudoDocument } from '@module/pseudo-document/pseudo-document.js'
import { TypedPseudoDocument } from '@module/pseudo-document/typed-pseudo-document.js'
import { ResourceTrackerModule as ModuleResourceTracker } from '@module/resource-tracker/index.js'
import { Token as ModuleToken } from '@module/token/index.js'
import { UI as ModuleUI } from '@module/ui/index.js'

export {}

declare global {
  interface GurpsGlobal extends GurpsUtils {
    SYSTEM_NAME: 'gurps'

    /* ---------------------------------------- */

    modules: {
      Action: typeof ModuleAction
      Actor: typeof ModuleActor
      Canvas: typeof ModuleCanvas
      Combat: typeof ModuleCombat
      CombatTracker: typeof ModuleCombatTracker
      Damage: typeof ModuleDamage
      Dev: typeof ModuleDev
      Importer: typeof ModuleImporter
      Item: typeof ModuleItem
      Pdf: typeof ModulePdf
      ResourceTracker: typeof ModuleResourceTracker
      Token: typeof ModuleToken
      UI: typeof ModuleUI
    }

    /* ---------------------------------------- */

    CONFIG: {
      /**
       * Holds the types and configurations for pseudo-documents, which are not actual Foundry documents but are used to
       * manage complex data structures within the system. Each entry defines a type of pseudo-document, its label for
       * localization, and the class that implements its behavior.
       */
      PseudoDocument: {
        Types: Record<gurps.Pseudo.Name, PseudoDocument.ConcreteConstructor | TypedPseudoDocument.ConcreteConstructor>
        Sheets: Record<gurps.Pseudo.Name, typeof PseudoDocumentSheet>
        SubTypes: PseudoDocumentConfig.Types
      }
    }
  }

  var GURPS: GurpsGlobal

  /* ---------------------------------------- */

  type PseudoDocumentConfig<T = any, S = any> = Record<
    string,
    {
      documentClass: T
      label?: string
      sheetClass?: S
    }
  >

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

  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface GurpsActorSheetEditMethods {}

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
