import { HandlebarsApplicationMixin, ActorSheet, Application } from '@gurps-types/foundry/index.js'
import {
  DisplayConditionalModifier,
  DisplayEquipment,
  DisplayMeleeAttack,
  DisplayNote,
  DisplayRangedAttack,
  DisplaySkill,
  DisplaySpell,
  DisplayTrait,
} from '@gurps-types/gurps/display-item.js'
import { Weight } from '@module/data/common/weight.js'
import type { ModelCollection } from '@module/data/model-collection.js'
import GurpsWiring from '@module/gurps-wiring.js'
import { ItemType } from '@module/item/types.js'
import { TrackerInstance } from '@module/resource-tracker/index.js'
import { contrastColor, toHexColor } from '@module/util/color-utils.js'
import { getCssVariable } from '@module/util/get-css-value.js'
import { getGame, isHTMLElement } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'
import { ConditionalInjury } from '@rules/injury/conditional-injury/conditional-injury.js'
import { Fatigue } from '@rules/injury/fatigue.js'
import { HitPoints, ThresholdDescriptor } from '@rules/injury/hit-points.js'
import { AnyObject, DeepPartial } from 'fvtt-types/utils'

import type { MoveModeV2 } from '../data/move-mode.js'
import Maneuvers from '../maneuver.js'
import { ActorType } from '../types.js'

import { GurpsBaseActorSheet } from './base-actor-sheet.js'
import {
  buildItemCopyWithChildren,
  getColorForState,
  getTextForState,
  openQuickNotesEditor,
  resolveItemDropPosition,
  resolveItemDropQuantity,
} from './helpers.js'

/* ---------------------------------------- */

type PoolEntry = {
  type: 'pool' | 'resourceTracker' | 'conditionalInjury'
  uuid?: string | null
  invertedDelta: boolean
  denominatorEditable: boolean
  editable: boolean
  numerator: {
    field: foundry.data.fields.NumberField<any>
    value: number
    path?: string
    label?: string
    initial?: number
    name?: string
  }
  denominator: {
    field: foundry.data.fields.NumberField<any>
    value: number
    path?: string
    label?: string
    name?: string
  }
  atMin?: boolean
  atMax: boolean
  name: string
  state?: string
  color?: string
  note?: string
  thresholds: ThresholdDescriptor[]
}

/* ---------------------------------------- */

type LiftingMovingEntry = {
  label: string
  value: string
}

/* ---------------------------------------- */

type AttributeEntry = {
  field: foundry.data.fields.DataField<any>
  name?: string
  value: unknown
  nonRollable?: boolean
}

/* ---------------------------------------- */

type DragData = { type: 'Item'; [key: string]: unknown } | { type: 'damageItem'; payload: AnyObject }

/* ---------------------------------------- */

namespace GurpsActorGcsSheet {
  export type Type = ActorType.Character

  /* ---------------------------------------- */

  export interface RenderContext extends ActorSheet.RenderContext {
    isPlay: boolean
    actor: Actor.OfType<Type>
    system: Actor.SystemOfType<Type>
    systemFields?: foundry.data.fields.SchemaField<
      foundry.abstract.DataModel.SchemaOf<Actor.SystemOfType<Type>>
    >['fields']
    systemSource?: foundry.data.fields.SchemaField.SourceData<
      foundry.abstract.DataModel.SchemaOf<Actor.SystemOfType<Type>>
    >
    moveModeChoices?: Record<string, string>
    pools: PoolEntry[]
    liftingMoving: LiftingMovingEntry[]
    traits: DisplayTrait[]
    skills: DisplaySkill[]
    spells: DisplaySpell[]
    carriedEquipment: DisplayEquipment[]
    otherEquipment: DisplayEquipment[]
    meleeAttacks: DisplayMeleeAttack[]
    rangedAttacks: DisplayRangedAttack[]
    notes: DisplayNote[]
    reactionModifiers: DisplayConditionalModifier[]
    conditionalModifiers: DisplayConditionalModifier[]
    sortKeys: Record<string, Record<string, string>>
    attributeFields: Record<string, AttributeEntry>
    maneuverChoices: Record<string, { label: string }>
    postureChoices: Record<string, { label: string }>
    createdDate: string
    modifiedDate: string
    quickNotes: Handlebars.SafeString
    carriedValue: string
    carriedWeight: string
    otherValue: string
    otherWeight: string
  }

  /* ---------------------------------------- */

  export interface ItemDropDetails {
    updates: { data: Item.UpdateData[]; operation: Item.Database.UpdateOperation }[]
    creations: { data: Item.CreateData[]; operation: Item.Database.CreateOperation<false> }[]
    deletions: { ids: string[]; operation: Item.Database.DeleteOperation }[]
    /** Optional info notification to display to the user after operations are executed. */
    notification?: string
  }
}

const POOL_COLOR_VARIABLE = '--gcs-color-default-pool'
const POOL_COLOR_FALLBACK = '#B1D175'

/* ---------------------------------------- */

class GurpsActorGcsSheet extends GurpsBaseActorSheet<
  GurpsActorGcsSheet.Type,
  ActorSheet.Configuration,
  ActorSheet.RenderOptions,
  GurpsActorGcsSheet.RenderContext
> {
  static readonly #pseudoDenominator = new foundry.data.fields.NumberField({ readonly: true, nullable: true })

  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: GurpsBaseActorSheet.DefaultOptions = {
    classes: ['gcs-sheet'],
    position: {
      width: 800,
      height: 800,
    },
    actions: {
      incrementPool: GurpsActorGcsSheet.#onUpdatePool,
      decrementPool: GurpsActorGcsSheet.#onUpdatePool,
      resetPool: GurpsActorGcsSheet.#onUpdatePool,
      sortItems: GurpsActorGcsSheet.#onSortItems,
      toggleNotes: GurpsActorGcsSheet.#onToggleNotes,
      editResourceTracker: GurpsActorGcsSheet.#onEditResourceTracker,
      setEncumbrance: GurpsActorGcsSheet.#onSetEncumbrance,
      editQuickNotes: GurpsActorGcsSheet.#onEditQuickNotes,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, HandlebarsApplicationMixin.HandlebarsTemplatePart> = {
    header: {
      template: systemPath('templates/actor/gcs/header.hbs'),
    },
    resources: {
      template: systemPath('templates/actor/gcs/resources.hbs'),
    },
    resourceTrackers: {
      template: systemPath('templates/actor/gcs/resource-trackers.hbs'),
    },
    quickNotes: {
      template: systemPath('templates/actor/gcs/quick-notes.hbs'),
    },
    reactions: {
      template: systemPath('templates/actor/gcs/reactions.hbs'),
    },
    combat: {
      template: systemPath('templates/actor/gcs/combat.hbs'),
    },
    traits: {
      template: systemPath('templates/actor/gcs/traits.hbs'),
    },
    skills: {
      template: systemPath('templates/actor/gcs/skills.hbs'),
    },
    spells: {
      template: systemPath('templates/actor/gcs/spells.hbs'),
    },
    equipment: {
      template: systemPath('templates/actor/gcs/equipment.hbs'),
    },
    notes: {
      template: systemPath('templates/actor/gcs/notes.hbs'),
    },
    footer: {
      template: systemPath('templates/actor/gcs/footer.hbs'),
    },
  }

  /* ---------------------------------------- */
  /*  Context Preparation                     */
  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: ActorSheet.RenderOptions
  ): Promise<GurpsActorGcsSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    const moveModes = this.actor.pseudoCollections.MoveMode as ModelCollection<MoveModeV2> | null

    const moveModeChoices = moveModes ? Object.fromEntries(moveModes.map(mode => [mode._id, mode.mode])) : {}

    const sortKeys = this._prepareSortKeys()

    // TODO: replace once Maneuvers is updated.
    const maneuverChoices = Maneuvers.getAllData() as Record<string, { label: string }>

    const postureChoices = Object.fromEntries([
      ['standing', { label: 'GURPS.status.Standing' }],
      ...Object.entries(GURPS.StatusEffect.getAllPostures()).map(([key, value]) => [key, { label: value.name }]),
    ])

    const createdDate = this.actor.system.profile.createdon
      ? new Date(this.actor.system.profile.createdon).toLocaleString()
      : ''

    const modifiedDate = this.actor.system.profile.modifiedon
      ? new Date(this.actor.system.profile.modifiedon).toLocaleString()
      : ''

    return {
      ...superContext,
      isPlay: this.isPlayMode,
      actor: this.actor,
      system: this.actor.system,
      systemFields: this.actor.system.schema.fields,
      systemSource: this.actor.system._source,
      moveModeChoices,
      createdDate,
      modifiedDate,
      pools: this._preparePools(),
      liftingMoving: this._prepareLiftingMoving(),
      traits: this.actor.system.adsV2.map(item => item.system.toDisplayItem()),
      skills: this.actor.system.skillsV2.map(item => item.system.toDisplayItem()),
      spells: this.actor.system.spellsV2.map(item => item.system.toDisplayItem()),
      carriedEquipment: this.actor.system.equipmentV2.carried.map(item => item.system.toDisplayItem()),
      otherEquipment: this.actor.system.equipmentV2.other.map(item => item.system.toDisplayItem()),
      notes: this.actor.system.notesV2.map(note => note.toDisplayItem()),
      meleeAttacks: this.actor.system.meleeV2.map(action => action.toDisplayItem()),
      rangedAttacks: this.actor.system.rangedV2.map(action => action.toDisplayItem()),
      reactionModifiers: this.actor.system.reactions.map(mod => mod.toDisplayItem()),
      conditionalModifiers: this.actor.system.conditionalmods.map(mod => mod.toDisplayItem()),
      attributeFields: this._prepareAttributes(),
      maneuverChoices,
      postureChoices,
      sortKeys,
      quickNotes: new Handlebars.SafeString(this.actor.system.additionalresources.qnotes),
      carriedValue: '$' + this.actor.system.eqtsummary.eqtcost.toLocaleString(),
      carriedWeight: Weight.fromPounds(this.actor.system.eqtsummary.eqtlbs).toString(),
      otherWeight: Weight.fromPounds(this.actor.system.eqtsummary.otherlbs).toString(),
      otherValue: '$' + this.actor.system.eqtsummary.othercost.toLocaleString(),
    }
  }

  /* ---------------------------------------- */

  protected _prepareAttributes(): Record<string, AttributeEntry> {
    const systemFields = this.actor.system.schema.fields
    const systemSource = this.actor.system._source
    const attributeFields = this.actor.system.schema.fields.attributes.fields
    const attributeSource = this.actor.system._source.attributes

    return {
      ST: {
        field: attributeFields.ST.fields.import,
        name: 'ST',
        value: attributeSource.ST.import,
      },
      DX: {
        field: attributeFields.DX.fields.import,
        name: 'DX',
        value: attributeSource.DX.import,
      },
      IQ: {
        field: attributeFields.IQ.fields.import,
        name: 'IQ',
        value: attributeSource.IQ.import,
      },
      HT: {
        field: attributeFields.HT.fields.import,
        name: 'HT',
        value: attributeSource.HT.import,
      },
      WILL: {
        field: attributeFields.WILL.fields.import,
        name: 'WILL',
        value: attributeSource.WILL.import,
      },
      frightCheck: {
        field: systemFields.frightcheck,
        name: 'frightcheck',
        value: systemSource.frightcheck,
      },
      PER: {
        field: attributeFields.PER.fields.import,
        name: 'PER',
        value: attributeSource.PER.import,
      },
      vision: {
        field: systemFields.vision,
        name: 'vision',
        value: systemSource.vision,
      },
      hearing: {
        field: systemFields.hearing,
        name: 'hearing',
        value: systemSource.hearing,
      },
      tasteSmell: {
        field: systemFields.tastesmell,
        name: 'tastesmell',
        value: systemSource.tastesmell,
      },
      touch: {
        field: systemFields.touch,
        name: 'touch',
        value: systemSource.touch,
      },
      basicSpeed: {
        field: systemFields.basicspeed.fields.value,
        value: systemSource.basicspeed.value,
        nonRollable: true,
      },
      basicMove: {
        field: systemFields.basicmove.fields.value,
        value: systemSource.basicmove.value,
        nonRollable: true,
      },
      basicThrust: {
        field: systemFields.thrust,
        value: systemSource.thrust,
        name: `${systemSource.thrust} dmg`,
      },
      basicSwing: {
        field: systemFields.swing,
        value: systemSource.swing,
        name: `${systemSource.swing} dmg`,
      },
    }
  }

  /* ---------------------------------------- */

  protected _prepareSortKeys(): Record<string, Record<string, string>> {
    const firstTrait = this.actor.system.allAdsV2[0]
    const firstSkill = this.actor.system.skillsV2[0]
    const firstSpell = this.actor.system.spellsV2[0]
    const firstEquipment = this.actor.system.allEquipmentV2[0]
    const firstNote = this.actor.system.notesV2[0]

    return {
      traits: firstTrait ? firstTrait.system.metadata.sortKeys : {},
      skills: firstSkill ? firstSkill.system.metadata.sortKeys : {},
      spells: firstSpell ? firstSpell.system.metadata.sortKeys : {},
      equipment: firstEquipment ? firstEquipment.system.metadata.sortKeys : {},
      notes: firstNote ? firstNote.metadata.sortKeys : {},
    }
  }

  /* ---------------------------------------- */

  protected _preparePools(): PoolEntry[] {
    const pools: PoolEntry[] = []

    const useConditionalInjury = getGame().settings.get('gurps', 'useConditionalInjury')

    if (useConditionalInjury) pools.push(...this._prepareConditionalInjuryPools())
    else pools.push(...this._prepareDefaultPools())

    const useQuintessence = getGame().settings.get('gurps', 'use-quintessence')

    if (useQuintessence) {
      pools.push(this.#prepareAttributePool('QP', []))
    }

    const defaultPoolColor = getCssVariable(document.body, POOL_COLOR_VARIABLE, POOL_COLOR_FALLBACK)

    for (const tracker of this.actor.system.additionalresources.tracker) {
      const currentThreshold = tracker.currentThreshold
      const thresholds = tracker.thresholdDescriptors

      pools.push({
        type: 'resourceTracker',
        uuid: tracker.uuid || null,
        invertedDelta: false,
        denominatorEditable: false,
        editable: true,
        numerator: {
          field: tracker.schema.fields.currentValue,
          path: tracker._id,
          value: tracker.value,
          initial: tracker.isAccumulator ? 0 : tracker.max,
          name: `${tracker.fieldPath}.${tracker._id}.currentValue`,
        },
        denominator: {
          field: GurpsActorGcsSheet.#pseudoDenominator,
          value: tracker.max,
          label: 'GURPS.sheet.gcsActorSheet.poolBase',
        },
        atMin: tracker.isMinEnforced && tracker.value === tracker.min,
        atMax: tracker.isMaxEnforced && tracker.value === tracker.max,
        name: tracker.name,
        state: currentThreshold?.state || '',
        color: currentThreshold?.color || defaultPoolColor,
        thresholds: thresholds,
      })
    }

    return pools
  }

  /* ---------------------------------------- */

  protected _prepareDefaultPools(): PoolEntry[] {
    const systemSource = this.actor.system._source

    const hpThresholds = HitPoints.getThresholds(systemSource.HP.max).reverse()
    const fpThresholds = Fatigue.getThresholds(systemSource.FP.max).reverse()

    return [this.#prepareAttributePool('HP', hpThresholds), this.#prepareAttributePool('FP', fpThresholds)]
  }

  #prepareAttributePool(key: 'HP' | 'FP' | 'QP', thresholds: ThresholdDescriptor[]): PoolEntry {
    const systemFields = this.actor.system.schema.fields
    const systemSource = this.actor.system._source

    const currentValue = this.actor.system[key].value
    const state = thresholds.find(threshold => threshold.value >= currentValue)

    const color = getColorForState(key, state?.state, this.options.classes?.includes('theme-dark') ? 'dark' : 'light')
    const text = getTextForState(key, state?.state)

    return {
      type: 'pool',
      invertedDelta: true,
      denominatorEditable: true,
      editable: false,
      numerator: {
        field: systemFields[key].fields.damage,
        path: `system.${key}.damage`,
        value: systemSource[key].damage,
        initial: 0,
      },
      denominator: {
        field: systemFields[key].fields.max,
        value: systemSource[key].max,
        label: 'GURPS.sheet.gcsActorSheet.poolBase',
      },
      atMax: systemSource[key].damage === 0,
      name: `GURPS.${key}`,
      state: text,
      color,
      thresholds,
    }
  }

  /* ---------------------------------------- */

  protected _prepareConditionalInjuryPools(): PoolEntry[] {
    const systemFields = this.actor.system.schema.fields
    const systemSource = this.actor.system._source

    const ciState = ConditionalInjury.thresholdForSeverity(systemSource.conditionalinjury.injury.severity)

    const color = getColorForState('CI', ciState.state, this.options.classes?.includes('theme-dark') ? 'dark' : 'light')
    const text = getTextForState('CI', ciState.state)

    return [
      {
        type: 'conditionalInjury',
        invertedDelta: false,
        denominatorEditable: false,
        editable: false,
        numerator: {
          field: systemFields.conditionalinjury.fields.injury.fields.severity,
          path: 'system.conditionalinjury.injury.severity',
          value: systemSource.conditionalinjury.injury.severity,
          initial: -7,
        },
        denominator: {
          field: systemFields.conditionalinjury.fields.RT.fields.value,
          value: systemSource.conditionalinjury.RT.value,
          label: 'GURPS.sheet.gcsActorSheet.poolBase',
        },
        atMin: systemSource.conditionalinjury.injury.severity < -6,
        atMax: systemSource.conditionalinjury.injury.severity >= 6,
        name: 'GURPS.severity',
        state: text,
        color,
        thresholds: ConditionalInjury.thresholds,
      },
      {
        type: 'conditionalInjury',
        invertedDelta: false,
        denominatorEditable: false,
        editable: false,
        numerator: {
          field: systemFields.conditionalinjury.fields.injury.fields.daystoheal,
          path: 'system.conditionalinjury.injury.daystoheal',
          value: systemSource.conditionalinjury.injury.daystoheal,
          initial: ciState.days,
        },
        denominator: {
          field: GurpsActorGcsSheet.#pseudoDenominator,
          value: ciState.days,
          label: 'GURPS.conditionalInjury.daysToHeal.max',
        },
        atMin: systemSource.conditionalinjury.injury.severity <= 0,
        atMax: systemSource.conditionalinjury.injury.daystoheal >= ciState.days,
        name: 'GURPS.conditionalInjury.daysToHeal.title',
        thresholds: [],
      },
    ]
  }

  /* ---------------------------------------- */

  protected _prepareLiftingMoving(): LiftingMovingEntry[] {
    const liftingMoving = this.actor.system.liftingmoving

    return [
      { label: 'GURPS.basicLift', value: liftingMoving.basiclift },
      { label: 'GURPS.oneHandLift', value: liftingMoving.onehandedlift },
      { label: 'GURPS.twoHandLift', value: liftingMoving.twohandedlift },
      { label: 'GURPS.shoveAndKnockOver', value: liftingMoving.shove },
      { label: 'GURPS.carryOnBack', value: liftingMoving.carryonback },
      { label: 'GURPS.runningShoveAndKnockOver', value: liftingMoving.runningshove },
      { label: 'GURPS.shiftSlightly', value: liftingMoving.shiftslightly },
    ].map(({ label, value }) => {
      return { label, value: value.toLocaleString() }
    })
  }

  /* ---------------------------------------- */
  /*  Non-Action Bindings                     */
  /* ---------------------------------------- */

  protected override async _onRender(
    context: DeepPartial<GurpsActorGcsSheet.RenderContext>,
    options: DeepPartial<GurpsBaseActorSheet.RenderOptions>
  ): Promise<void> {
    super._onRender(context, options)

    const elements = [...this.element.querySelectorAll<HTMLElement>('*')].filter(
      element => element.children.length === 0 && /\[([^[\]]+)\]/.test(element.innerText)
    )

    elements.push(this.element.querySelector<HTMLElement>('.quick-notes')!)

    for (const otfElement of elements) {
      const otfTextMatches = [...otfElement.innerText.matchAll(/\[([^[\]]+)\]/gi)]

      if (otfTextMatches.length === 0) continue

      for (const match of otfTextMatches) {
        const otfText = match[1]
        const parsedOtf = GURPS.parselink(otfText)

        if (parsedOtf.text) {
          otfElement.innerHTML = otfElement.innerHTML.replace(`[${otfText}]`, parsedOtf.text)
        }
      }
    }

    const itemRows = this.element.querySelectorAll<HTMLElement>('.gcs-item-row')

    for (const itemRow of itemRows) {
      const equippedColumn = itemRow.querySelector<HTMLElement>('.gcs-item-equipped')

      equippedColumn?.addEventListener('click', async event => {
        event.preventDefault()

        const itemId = itemRow.dataset.itemId

        if (!itemId) {
          console.error('No item id found on item row')

          return
        }

        const item = this.actor.items.get(itemId)

        if (!item || !item.isOfType(ItemType.Equipment)) {
          console.error(`Item with id ${itemId} is not of type equipmentV2`)

          return
        }

        await item.update({ 'system.equipped': !item.system.equipped } as Item.UpdateData)
      })

      itemRow.addEventListener('dblclick', event => {
        event.preventDefault()
        const target = event.currentTarget as HTMLElement
        const itemId = target.dataset.itemId

        if (!itemId) {
          console.error('No item id found on item row')

          return
        }

        const item = this.actor.items.get(itemId)

        if (!item) {
          console.error(`No item found with id ${itemId}`)

          return
        }

        const sheet = item.sheet

        if (item.isOwner && sheet) {
          if (sheet instanceof foundry.applications.sheets.ItemSheetV2) sheet.render({ force: true })
          else sheet.render(true)
        }
      })
    }

    // Change Maneuver

    const maneuverSelect = this.element.querySelector<HTMLSelectElement>('select[name="maneuver"]')

    maneuverSelect?.addEventListener('change', async event => {
      event.preventDefault()

      const value = event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : 'do_nothing'

      await this.actor.replaceManeuver(value)
    })

    // Change Posture

    const postureSelect = this.element.querySelector<HTMLSelectElement>('select[name="posture"]')

    postureSelect?.addEventListener('change', async event => {
      event.preventDefault()

      const value = event.currentTarget instanceof HTMLSelectElement ? event.currentTarget.value : 'standing'

      await this.actor.replacePosture(value)
    })

    // Color pool-state foreground based on background color.

    const poolStates = this.element.querySelectorAll<HTMLElement>('.pool-state')

    for (const poolState of poolStates) {
      const backgroundColor = getComputedStyle(poolState).backgroundColor
      const hexColor = toHexColor(backgroundColor)

      if (hexColor) {
        const foregroundColor = contrastColor(hexColor, '#1c1a17', '#f8f6f2')

        poolState.style.color = foregroundColor
      }
    }

    GurpsWiring.hookupAllEvents(this.element)
  }

  /* ---------------------------------------- */

  protected override async _onFirstRender(
    context: DeepPartial<GurpsActorGcsSheet.RenderContext>,
    options: DeepPartial<GurpsBaseActorSheet.RenderOptions>
  ): Promise<void> {
    super._onFirstRender(context, options)

    this._createContextMenu(this._createItemContextOptions, '.gcs-item-row', {
      jQuery: false,
      hookName: 'createItemContextOptions',
      parentClassHooks: false,
      fixed: true,
      eventName: 'contextmenu',
    })

    this._createContextMenu(this._createPseudoDocumentContextOptions, '.gcs-action-row', {
      jQuery: false,
      hookName: 'createPseudoDocumentContextOptions',
      parentClassHooks: false,
      fixed: true,
      eventName: 'contextmenu',
    })
  }

  /* ---------------------------------------- */

  protected _createItemContextOptions(): foundry.applications.ux.ContextMenu.Entry<HTMLElement>[] {
    return [
      {
        name: 'Delete',
        icon: '<i class="fa-solid fa-fw fa-trash"></i>',
        condition: target => target.dataset.uuid !== undefined,
        callback: async target => {
          const handler = this.options.actions['deleteEmbedded'] as Application.ClickAction | null
          const event = new PointerEvent('click', { bubbles: true })

          if (handler) handler.call(this, event, target)
        },
      },
    ]
  }

  /* ---------------------------------------- */

  protected _createPseudoDocumentContextOptions(): foundry.applications.ux.ContextMenu.Entry<HTMLElement>[] {
    return [
      {
        name: 'Delete',
        icon: '<i class="fa-solid fa-fw fa-trash"></i>',
        condition: target => target.dataset.uuid !== undefined,
        callback: async target => {
          const handler = this.options.actions['deleteEmbedded'] as Application.ClickAction | null
          const event = new PointerEvent('click', { bubbles: true })

          if (handler) handler.call(this, event, target)
        },
      },
    ]
  }

  /* ---------------------------------------- */
  /*  Action Bindings                         */
  /* ---------------------------------------- */

  static async #onSortItems(this: GurpsActorGcsSheet, _event: PointerEvent, target: HTMLElement): Promise<void> {
    const getItemList = (part: string): Item.Implementation[] => {
      switch (part) {
        case 'traits':
          return this.actor.system.allAdsV2
        case 'skills':
          return this.actor.system.allSkillsV2
        case 'spells':
          return this.actor.system.allSpellsV2
        case 'carriedEquipment':
          return this.actor.system.allEquipmentCarried
        case 'otherEquipment':
          return this.actor.system.allEquipmentOther
        default:
          return []
      }
    }

    const tableId = target.closest<HTMLElement>('[data-table-id]')?.dataset.tableId ?? ''
    const sortBy = target.dataset.sortBy ?? ''
    const allItems = getItemList(tableId)

    if (allItems.length === 0) return

    // Group items by their container so each containment level sorts independently.
    const grouped = new Map<string | null, Item.Implementation[]>()

    for (const item of allItems) {
      const key = item.system.containedBy
      const bucket = grouped.get(key)

      if (bucket) bucket.push(item)
      else grouped.set(key, [item])
    }

    // Primary sort by the requested field; fall back to name for stability.
    const comparator = (left: Item.Implementation, right: Item.Implementation): number => {
      const leftValue = foundry.utils.getProperty(left, sortBy) ?? ''
      const rightValue = foundry.utils.getProperty(right, sortBy) ?? ''

      const fieldResult =
        typeof leftValue === 'number' && typeof rightValue === 'number'
          ? leftValue - rightValue
          : String(leftValue).localeCompare(String(rightValue))

      return fieldResult !== 0 ? fieldResult : left.name.localeCompare(right.name)
    }

    // Toggle direction: if top-level items are already in ascending order, sort descending.
    const topLevel = [...(grouped.get(null) ?? [])].sort((left, right) => left.sort - right.sort)
    const topLevelAscending = [...topLevel].sort(comparator)
    const alreadyAscending = topLevel.every((item, index) => item._id === topLevelAscending[index]._id)
    const direction = alreadyAscending ? -1 : 1

    // Sort each group independently and collect update payloads.
    const updates: { _id: string; sort: number }[] = []

    for (const group of grouped.values()) {
      const sorted = [...group].sort((left, right) => direction * comparator(left, right))

      sorted.forEach((item, index) => {
        updates.push({ _id: item._id!, sort: (index + 1) * CONST.SORT_INTEGER_DENSITY })
      })
    }

    await this.actor.updateEmbeddedDocuments('Item', updates)
  }

  /* ---------------------------------------- */

  static async #onToggleNotes(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()
    const doc = await this._getEmbedded(target)

    if (!doc) return

    if ('toggleNotes' in doc && typeof doc.toggleNotes === 'function') await doc.toggleNotes()
    else {
      console.warn('Tried to toggle notes on a document that does not have a toggleNotes method', doc)
    }
  }

  /* ---------------------------------------- */

  static async #onUpdatePool(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const action = target.dataset.action as 'incrementPool' | 'decrementPool' | 'resetPool'
    const inverted = target.dataset.inverted === 'true'

    let valueDelta = action === 'incrementPool' ? 1 : action === 'decrementPool' ? -1 : 0

    if (inverted) valueDelta = -valueDelta

    const path = target.dataset.path

    if (!path) {
      console.error('No pool path provided')

      return
    }

    const pathValue = GurpsActorGcsSheet.#getPoolCurrentValue(this, path)

    if (pathValue === null) {
      console.error(`Invalid pool path provided, value does not exist or is not a number: ${path}`)

      return
    }

    let newValue = 0

    if (action === 'resetPool') {
      const initial = parseInt(target.dataset.initial ?? '0', 10)

      if (!isNaN(initial)) newValue = initial
    } else {
      newValue = pathValue + valueDelta
    }

    await GurpsActorGcsSheet.#setPoolValue(this, path, newValue)
  }

  /* ---------------------------------------- */

  static #getPoolCurrentValue(sheet: GurpsActorGcsSheet, path: string): number | null {
    const tracker = sheet.actor.system.additionalresources.tracker.get(path)

    if (tracker) return tracker.value

    const value = foundry.utils.getProperty(sheet.actor, path)

    return typeof value === 'number' ? value : null
  }

  /* ---------------------------------------- */

  static async #setPoolValue(sheet: GurpsActorGcsSheet, path: string, newValue: number): Promise<void> {
    const tracker = sheet.actor.system.additionalresources.tracker.get(path)

    if (tracker) {
      await tracker.update({ currentValue: newValue })
    } else {
      await sheet.actor.update({ [path]: newValue })
    }
  }

  /* ---------------------------------------- */

  static async #onEditResourceTracker(
    this: GurpsActorGcsSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault()

    const tracker = await this._getEmbedded(target)

    if (!(tracker instanceof TrackerInstance)) {
      console.error(
        'Resource tracker edit button was clicked, but no valid tracker instance could be found for the clicked element'
      )

      return
    }

    await GURPS.modules.ResourceTracker.updateResourceTracker(this.actor, tracker)
  }

  /* ---------------------------------------- */

  static async #onSetEncumbrance(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const index = target.dataset.index

    if (!index) {
      console.error('No encumbrance index provided')

      return
    }

    if (getGame().settings.get(GURPS.SYSTEM_NAME, 'automatic-encumbrance')) return

    await this.actor.update({ 'system.additionalresources.currentEncumbrance': parseInt(index) } as Actor.UpdateData)
  }

  /* ---------------------------------------- */

  static async #onEditQuickNotes(this: GurpsActorGcsSheet, event: PointerEvent): Promise<void> {
    event.preventDefault()

    await openQuickNotesEditor(this.actor)
  }

  /* ---------------------------------------- */
  /*  Drag & Drop Handling                    */
  /* ---------------------------------------- */

  protected override async _onDrop(event: DragEvent): Promise<void> {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event) as DragData | null

    if (!data) return

    switch (data.type) {
      case 'Item': {
        // Resolve the item ourselves rather than delegating to super._onDrop, which would route
        // same-actor drops through _onSortItem (bypassing our custom position/sort logic).
        const item = await fromUuid<Item.Implementation>(data.uuid as string)

        if (item) await this._onDropItem(event, item)

        return
      }
      case 'damageItem': {
        return this.actor.handleDamageDrop(data.payload)
      }
    }
  }

  /* ---------------------------------------- */

  protected async _resolveItemDropDetails(
    event: DragEvent,
    item: Item.Implementation
  ): Promise<GurpsActorGcsSheet.ItemDropDetails | null> {
    if (!isHTMLElement(event.target)) return null

    const element = event.target

    // Phase A: Resolve drop target from DOM. dropTarget may be null when the user drops onto
    // an empty section — in that case the item becomes a top-level item (containedBy = null).
    const dropTarget = element.closest<HTMLElement>('[data-item-id]')
    let target: Item.Implementation | null = dropTarget
      ? (this.actor.items.get(dropTarget.dataset.itemId!) ?? null)
      : null

    // Phase B: Validate that the dropped item and the target item are the same type.
    if (target && target.type !== item.type) {
      ui.notifications?.warn('GURPS.dragDrop.itemTypeMismatch', { localize: true })

      return null
    }

    // Phase C: Determine whether the item will be "carried" or "other" equipment. When there is
    // a target item, inherit its carried state. Otherwise read the section table from the DOM.
    let carried = true

    if (target?.isOfType(ItemType.Equipment)) {
      carried = target.system.carried
    } else {
      const tableId = element.closest<HTMLElement>('[data-table-id]')?.dataset.tableId

      carried = tableId === 'carriedEquipment'
    }

    // Phase D: When dropping onto an existing item, ask the user whether the dropped item should
    // land before the target or inside it (as a child). Empty-section drops skip this dialog and
    // go straight to the top level.
    const dropPosition = target ? await resolveItemDropPosition(target) : null

    // null means the user cancelled the dialog — abort. (For empty-section drops dropPosition is
    // also null, but target is null too, so this guard only fires when the user had a choice.)
    if (target && dropPosition === null) return null

    // Phase E: Determine sort siblings, containedBy, and the target's container based on the
    // chosen drop position.
    //
    // Default (null drop position, i.e. empty-section drop):
    //   • siblings = all top-level items of this type in the target section
    //   • containedBy = null (top-level)
    //   • targetContainer = null
    let siblings = this.actor.system.getCollectionForItemType(item.type, carried)
    let containedBy: string | null = null
    let targetContainer: Item.Implementation | null = null

    if (dropPosition === 'inside') {
      // The target item becomes the new container. The first child becomes the sort anchor so
      // the dropped item is inserted before it.
      containedBy = dropTarget!.dataset.itemId!
      targetContainer = target
      siblings = target?.system.children ?? []
      target = siblings[0] ?? null
    } else if (dropPosition === 'before') {
      // Inherit the target item's container as the new parent, and sort among its siblings.
      containedBy = target?.system.containedBy ?? null
      targetContainer = target?.system.container ?? null
      if (targetContainer) siblings = targetContainer.system.children
    }

    // Phase F: Calculate sort values.
    //
    // performIntegerSort uses strict reference equality (sib === target) to locate the target
    // within the siblings array. Re-resolve the target from within siblings first to guarantee
    // the reference matches, guarding against any staleness between data-preparation cycles.
    const sortTarget = target
      ? (siblings.find(sibling => sibling === target) ?? siblings.find(sibling => sibling.id === target.id) ?? null)
      : null

    const sortUpdates = foundry.utils.performIntegerSort(item, { target: sortTarget, siblings, sortBefore: true })

    // Use reference equality (not _id vs id) to find item's own update entry.
    const sort = sortUpdates.find(sortUpdate => sortUpdate.target === item)?.update.sort

    // Phase G: Initialise the details accumulator.
    const details: GurpsActorGcsSheet.ItemDropDetails = {
      updates: [],
      creations: [],
      deletions: [],
    }

    // Push sort updates for any siblings that need reindexing (the reindex case in
    // performIntegerSort returns updates for all siblings, not just the dropped item).
    const siblingSortData = sortUpdates
      .filter(sortUpdate => sortUpdate.target !== item)
      .map(sortUpdate => ({ _id: sortUpdate.target._id, sort: sortUpdate.update.sort }) as Item.UpdateData)

    if (siblingSortData.length > 0) {
      details.updates.push({ data: siblingSortData, operation: { parent: this.actor } })
    }

    // Phase H: Equipment-specific handling. Equipment requires a quantity prompt so the user can
    // transfer only part of a stack. The behaviour then diverges based on actor origin.
    if (item.isOfType(ItemType.Equipment)) {
      // Skip the dialog when there is only one item — the entire stack is always transferred.
      const transferredQuantity = item.system.count === 1 ? 1 : await resolveItemDropQuantity(item)

      if (transferredQuantity === null) return null

      const remainingQuantity = item.system.count - transferredQuantity

      if (item.actor !== this.actor) {
        // Cross-actor transfer: create a copy on this actor with the transferred quantity and
        // fresh IDs for the item and all its descendants.
        const newItemData = foundry.utils.mergeObject(item.toObject(), {
          _id: foundry.utils.randomID(),
          system: { count: transferredQuantity, containedBy, _carried: carried },
          sort,
        })
        const newChildData = item.system.children.flatMap(child =>
          buildItemCopyWithChildren(child as Item.OfType<ItemType.Equipment>, newItemData._id, carried)
        ) as Item.CreateData[]

        details.creations.push({
          data: [newItemData, ...newChildData],
          operation: { parent: this.actor, keepId: true },
        })
        details.notification = game.i18n!.format('GURPS.dragDrop.equipmentTransferred', {
          count: String(transferredQuantity),
          itemName: item.name,
          sourceName: item.actor?.name ?? '?',
          targetName: this.actor.name,
        })

        // If the user cannot modify the source item, fall back to a copy-only drop.
        if (item.isOwner) {
          if (remainingQuantity <= 0) {
            // Delete the item and all its descendants — children are not automatically cascade-deleted
            // when their container is removed, so we must include them explicitly.
            const allSourceIds = [item.id!, ...item.system.allContents.map(descendant => descendant.id!)]

            details.deletions.push({ ids: allSourceIds, operation: { parent: item.parent! } })
          } else {
            details.updates.push({
              data: [{ _id: item._id, 'system.count': remainingQuantity } as Item.UpdateData],
              operation: { parent: item.parent! },
            })
          }
        }
      } else {
        // Same-actor move or stack split.

        // Guard against circular containment before doing anything else.
        if (
          (target && item.system.containsItem(target)) ||
          (targetContainer && item.system.containsItem(targetContainer))
        ) {
          ui.notifications?.warn('GURPS.dragDrop.itemContainerLoop', { localize: true })

          return null
        }

        // Children always need their _carried state synced with the item's new location.
        const childCarriedUpdates = item.system.children.map(child => ({
          _id: child._id,
          'system._carried': carried,
        })) as Item.UpdateData[]

        if (remainingQuantity > 0) {
          // Splitting the stack: move the transferred portion to the drop location and leave the
          // remainder in place. Children are duplicated so both stacks have copies.
          const newItemData = foundry.utils.mergeObject(item.toObject(), {
            _id: foundry.utils.randomID(),
            system: { count: transferredQuantity, containedBy, _carried: carried },
            sort,
          })
          const newChildData = item.system.children.flatMap(child =>
            buildItemCopyWithChildren(child as Item.OfType<ItemType.Equipment>, newItemData._id, carried)
          ) as Item.CreateData[]

          details.creations.push({
            data: [newItemData, ...newChildData],
            operation: { parent: this.actor, keepId: true },
          })
          details.updates.push({
            data: [{ _id: item._id, 'system.count': remainingQuantity } as Item.UpdateData, ...childCarriedUpdates],
            operation: { parent: this.actor },
          })
        } else {
          // Moving the full stack: one batched update covers the item and all its children.
          details.updates.push({
            data: [
              {
                _id: item._id,
                'system.containedBy': containedBy,
                'system.count': transferredQuantity,
                'system._carried': carried,
                sort,
              } as Item.UpdateData,
              ...childCarriedUpdates,
            ],
            operation: { parent: this.actor },
          })
        }
      }

      return details
    }

    // Phase I: Non-equipment items (traits, skills, spells). These are always copied when moving
    // between actors — there is no quantity to transfer and no deletion on the source.
    if (item.actor !== this.actor) {
      const newItemData = foundry.utils.mergeObject(item.toObject(), {
        _id: foundry.utils.randomID(),
        system: { containedBy, _carried: carried },
        sort,
      })
      const newChildData = item.system.children.flatMap(child =>
        buildItemCopyWithChildren(child, newItemData._id, carried)
      ) as Item.CreateData[]

      details.creations.push({ data: [newItemData, ...newChildData], operation: { parent: this.actor, keepId: true } })
      details.notification = game.i18n!.format('GURPS.dragDrop.itemCopied', {
        itemName: item.name,
        targetName: this.actor.name,
        sourceName: item.actor?.name ?? '?',
      })
    } else {
      // Same actor: guard circular containment then update containedBy and sort position.
      if (
        (target && item.system.containsItem(target)) ||
        (targetContainer && item.system.containsItem(targetContainer))
      ) {
        ui.notifications?.warn('GURPS.dragDrop.itemContainerLoop', { localize: true })

        return null
      }

      details.updates.push({
        data: [{ _id: item._id, 'system.containedBy': containedBy, sort } as Item.UpdateData],
        operation: { parent: this.actor },
      })
    }

    return details
  }

  /* ---------------------------------------- */

  protected override async _onDropItem(
    event: DragEvent,
    item: Item.Implementation
  ): Promise<Item.Implementation | null> {
    if (!this.actor.isOwner) return null

    const details = await this._resolveItemDropDetails(event, item)

    if (!details) return null

    // Execute batched operations. Order: deletions first to free IDs, then creations, then updates.
    for (const { ids, operation } of details.deletions) {
      await Item.deleteDocuments(ids, operation)
    }

    for (const { data, operation } of details.creations) {
      await Item.createDocuments(data, operation)
    }

    for (const { data, operation } of details.updates) {
      await Item.updateDocuments(data, operation)
    }

    if (details.notification) ui.notifications?.info(details.notification)

    return item
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
