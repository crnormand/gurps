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
import { getGame } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'
import { ConditionalInjury } from '@rules/injury/conditional-injury/conditional-injury.js'
import { Fatigue } from '@rules/injury/fatigue.js'
import { HitPoints, ThresholdDescriptor } from '@rules/injury/hit-points.js'
import { AnyObject, DeepPartial } from 'fvtt-types/utils'

import type { MoveModeV2 } from '../data/move-mode.js'
import Maneuvers from '../maneuver.js'
import { ActorType } from '../types.js'

import { GurpsBaseActorSheet } from './base-actor-sheet.js'
import { getColorForState, getTextForState, openQuickNotesEditor, resolveItemDropDetails } from './helpers.js'

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
        field: attributeFields.ST.fields.importedValue,
        name: 'ST',
        value: attributeSource.ST.importedValue,
      },
      DX: {
        field: attributeFields.DX.fields.importedValue,
        name: 'DX',
        value: attributeSource.DX.importedValue,
      },
      IQ: {
        field: attributeFields.IQ.fields.importedValue,
        name: 'IQ',
        value: attributeSource.IQ.importedValue,
      },
      HT: {
        field: attributeFields.HT.fields.importedValue,
        name: 'HT',
        value: attributeSource.HT.importedValue,
      },
      WILL: {
        field: attributeFields.WILL.fields.importedValue,
        name: 'WILL',
        value: attributeSource.WILL.importedValue,
      },
      frightCheck: {
        field: systemFields.frightcheck,
        name: 'frightcheck',
        value: systemSource.frightcheck,
      },
      PER: {
        field: attributeFields.PER.fields.importedValue,
        name: 'PER',
        value: attributeSource.PER.importedValue,
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
      thresholds: thresholds.map(({ state, value }) => ({ state: `GURPS.status.${state}`, value })),
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
    return resolveItemDropDetails(this, event, item)
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
