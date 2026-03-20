import {
  DisplayEquipment,
  DisplayMeleeAttack,
  DisplayRangedAttack,
  DisplaySkill,
  DisplaySpell,
  DisplayTrait,
} from '@gurps-types/gurps/display-item.js'
import GurpsWiring from '@module/gurps-wiring.js'
import { isHTMLElement } from '@module/util/guards.js'
import { systemPath } from '@module/util/misc.js'
import { Fatigue } from '@rules/injury/fatigue.js'
import { HitPoints, ThresholdDescriptor } from '@rules/injury/hit-points.js'

import Maneuvers from '../maneuver.js'

import { GurpsBaseActorSheet } from './base-actor-sheet.js'
import { buildItemCopyWithChildren, resolveItemDropPosition, resolveItemDropQuantity } from './helpers.js'

import ActorSheet = gurps.applications.ActorSheet

/* ---------------------------------------- */

type CharacterV2Schema = foundry.abstract.DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>

/* ---------------------------------------- */

type PoolEntry = {
  type: 'pool' | 'resourceTracker'
  fields: {
    numerator: foundry.data.fields.NumberField<any>
    denominator: foundry.data.fields.NumberField<any>
  }
  path: string
  numerator: number
  denominator: number
  atMax: boolean
  name: string
  state: string
  color: string
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

// NOTE: temporary, more types will be added as drag & drop functionality is implemented
type DragData = {
  type: 'Item'
  id: string
  uuid: string
}

/* ---------------------------------------- */

type DisplayConditionalModifier = {
  modifier: number
  situation: string
}

/* ---------------------------------------- */

namespace GurpsActorGcsSheet {
  export interface RenderContext extends ActorSheet.RenderContext {
    isPlay: boolean
    actor: Actor.OfType<'characterV2'>
    system: Actor.SystemOfType<'characterV2'>
    systemFields?: foundry.data.fields.SchemaField<CharacterV2Schema>['fields']
    systemSource?: foundry.data.fields.SchemaField.SourceData<CharacterV2Schema>
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
    reactionModifiers: DisplayConditionalModifier[]
    conditionalModifiers: DisplayConditionalModifier[]
    sortKeys: Record<string, Record<string, string>>
    attributeFields: Record<string, AttributeEntry>
    maneuverChoices: Record<string, { label: string }>
    postureChoices: Record<string, { label: string }>
    createdDate: string
    modifiedDate: string
  }
}

/* ---------------------------------------- */

class GurpsActorGcsSheet extends GurpsBaseActorSheet<'characterV2'>() {
  static override DEFAULT_OPTIONS: ActorSheet.Configuration = {
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
      toggleItemContainer: GurpsActorGcsSheet.#onToggleItemContainer,
      toggleItemNotes: GurpsActorGcsSheet.#onToggleItemNotes,
      addModifier: GurpsActorGcsSheet.#onAddModifier,
      rollOtf: GurpsActorGcsSheet.#onRollOtf,
      editResourceTracker: GurpsActorGcsSheet.#onEditResourceTracker,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, gurps.applications.handlebars.TemplatePart> = {
    header: {
      template: systemPath('templates/actor/gcs/header.hbs'),
    },
    resources: {
      template: systemPath('templates/actor/gcs/resources.hbs'),
    },
    resourceTrackers: {
      template: systemPath('templates/actor/gcs/resource-trackers.hbs'),
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

    const moveModeChoices = Object.fromEntries(this.actor.system.moveV2.map(mode => [mode._id, mode.mode]))

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

    // NOTE: posture resets on save, need to fix that. the system data should be the source of truth.

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
      meleeAttacks: this.actor.system.meleeV2.map(action => action.toDisplayItem()),
      rangedAttacks: this.actor.system.rangedV2.map(action => action.toDisplayItem()),
      reactionModifiers: this.actor.system.reactions,
      conditionalModifiers: this.actor.system.conditionalmods,
      attributeFields: this._prepareAttributes(),
      maneuverChoices,
      postureChoices,
      sortKeys,
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

    return {
      traits: firstTrait ? firstTrait.system.metadata.sortKeys : {},
      skills: firstSkill ? firstSkill.system.metadata.sortKeys : {},
      spells: firstSpell ? firstSpell.system.metadata.sortKeys : {},
      equipment: firstEquipment ? firstEquipment.system.metadata.sortKeys : {},
    }
  }

  /* ---------------------------------------- */

  protected _preparePools(): PoolEntry[] {
    const pools: PoolEntry[] = []
    const systemFields = this.actor.system.schema.fields
    const systemSource = this.actor.system._source

    const defaultColor = '#4a9b4b'

    const hpThresholds = HitPoints.getThresholds(systemSource.HP.max).reverse()
    const fpThresholds = Fatigue.getThresholds(systemSource.FP.max).reverse()

    const hpState = hpThresholds.find(threshold => threshold.value >= this.actor.system.HP.value)
    const fpState = fpThresholds.find(threshold => threshold.value >= this.actor.system.FP.value)

    pools.push(
      {
        type: 'pool',
        fields: {
          numerator: systemFields.HP.fields.damage,
          denominator: systemFields.HP.fields.max,
        },
        path: 'system.HP.damage',
        numerator: systemSource.HP.damage,
        denominator: systemSource.HP.max,
        atMax: systemSource.HP.damage === 0,
        name: 'GURPS.HP',
        state: hpState?.condition || '',
        color: hpState?.color || defaultColor,
        thresholds: hpThresholds,
      },
      {
        type: 'pool',
        fields: {
          numerator: systemFields.FP.fields.damage,
          denominator: systemFields.FP.fields.max,
        },
        path: 'system.FP.damage',
        numerator: systemSource.FP.damage,
        denominator: systemSource.FP.max,
        atMax: systemSource.FP.damage === 0,
        name: 'GURPS.FP',
        state: fpState?.condition || '',
        color: fpState?.color || defaultColor,
        thresholds: fpThresholds,
      }
    )

    for (const tracker of this.actor.system.additionalresources.tracker) {
      const pseudoDenominator = new foundry.data.fields.NumberField({ readonly: true, nullable: true })

      const currentThreshold = tracker.currentThreshold

      const thresholds = tracker.thresholdDescriptors

      pools.push({
        type: 'resourceTracker',
        fields: {
          numerator: tracker.schema.fields.currentValue,
          denominator: pseudoDenominator,
        },
        path: tracker._id,
        numerator: tracker.value,
        denominator: tracker.max,
        atMax: tracker.value === tracker.max,
        name: tracker.name,
        state: currentThreshold?.condition || '',
        color: currentThreshold?.color || defaultColor,
        thresholds: thresholds,
      })
    }

    return pools
  }

  /* ---------------------------------------- */

  protected _prepareLiftingMoving(): LiftingMovingEntry[] {
    const liftingMoving = this.actor.system.liftingmoving

    return [
      { label: 'GURPS.basicLift', value: liftingMoving.basiclift },
      { label: 'GURPS.oneHandLift', value: liftingMoving.onehandedlift },
      { label: 'GURPS.twoHandLift', value: liftingMoving.twohandedlift },
      { label: 'GURPS.shoveAndKnockOver', value: liftingMoving.shove },
      { label: 'GURPS.runningShoveAndKnockOver', value: liftingMoving.runningshove },
      { label: 'GURPS.shiftSlightly', value: liftingMoving.shiftslightly },
      { label: 'GURPS.carryOnBack', value: liftingMoving.carryonback },
    ].map(({ label, value }) => {
      return { label, value: value.toLocaleString() }
    })
  }

  /* ---------------------------------------- */
  /*  Non-Action Bindings                     */
  /* ---------------------------------------- */

  protected override async _onRender(
    context: ActorSheet.RenderContext,
    options: ActorSheet.RenderOptions
  ): Promise<void> {
    super._onRender(context, options)

    const elements = [...this.element.querySelectorAll<HTMLElement>('*')].filter(
      element => element.children.length === 0 && /\[([^[\]]+)\]/.test(element.innerText)
    )

    for (const otfElement of elements) {
      const otfTextMatches = [...otfElement.innerText.matchAll(/\[([^[\]]+)\]/gi)]

      if (otfTextMatches.length === 0) continue

      for (const match of otfTextMatches) {
        const otfText = match[1]
        const parsedOtf = GURPS.parselink(otfText)

        console.log('Parsed OTF:', { otfText, parsedOtf })

        if (parsedOtf.text) {
          otfElement.innerHTML = otfElement.innerHTML.replace(`[${otfText}]`, parsedOtf.text)
        }
      }
    }

    GurpsWiring.hookupAllEvents(this.element)
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
          return this.actor.system.equipmentV2.carried
        case 'otherEquipment':
          return this.actor.system.equipmentV2.other
        default:
          return []
      }
    }

    const tableId = target.closest<HTMLElement>('[data-table-id]')?.dataset.tableId ?? ''
    const sortBy = target.dataset.sortBy
    const itemList = getItemList(tableId)

    const unsortedIds = itemList.map(i => i._id)

    let sortedIds = itemList
      .sort((left, right) => {
        return left.name.localeCompare(right.name)
      })
      .sort((left, right) => {
        const leftValue = foundry.utils.getProperty(left, sortBy ?? '') ?? 0
        const rightValue = foundry.utils.getProperty(right, sortBy ?? '') ?? 0

        switch (typeof leftValue) {
          case 'number':
            return leftValue - (rightValue as number)
          case 'string':
            return leftValue.localeCompare(rightValue as string)
          default:
            return 0
        }
      })
      .map(item => item._id)

    if (unsortedIds.equals(sortedIds)) sortedIds = sortedIds.reverse()

    const sortUpdates = sortedIds.map((_id, index) => {
      return { _id, sort: (index + 1) * CONST.SORT_INTEGER_DENSITY }
    })

    await this.actor.updateEmbeddedDocuments('Item', sortUpdates)
  }

  /* ---------------------------------------- */

  static async #onToggleItemContainer(
    this: GurpsActorGcsSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault()

    const itemId = target.closest<HTMLElement>('[data-item-id]')?.dataset.itemId

    if (!itemId) return

    const item = this.actor.items.get(itemId)

    await item?.system.toggleOpen?.()
  }

  /* ---------------------------------------- */

  static async #onToggleItemNotes(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const itemId = target.closest<HTMLElement>('[data-item-id]')?.dataset.itemId
    const isNowOpen = target.dataset.open === 'true'

    if (!itemId) return

    const item = this.actor.items.get(itemId)

    if (item?.system && 'notesOpen' in item.system) {
      await item?.update({ 'system.notesOpen': !isNowOpen } as Record<string, unknown>)
    }
  }

  /* ---------------------------------------- */

  static async #onUpdatePool(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const valueDelta =
      target.dataset.action === 'incrementPool' ? 1 : target.dataset.action === 'decrementPool' ? -1 : 0

    const systemPath = target.dataset.path

    if (!systemPath) {
      console.error('No pool path provided')

      return
    }

    const pathValue = foundry.utils.getProperty(this.actor, systemPath)

    if (pathValue === undefined || pathValue === null || typeof pathValue !== 'number') {
      console.error(`Invalid pool path provided, value does not exist or is not a number: ${systemPath}`)

      return
    }

    let newValue = 0

    if (target.dataset.action !== 'resetPool') {
      const maxPath = systemPath.replace(/\.value$/, '.max')
      const maxValue = foundry.utils.getProperty(this.actor, maxPath)

      newValue =
        valueDelta > 0 && typeof maxValue === 'number'
          ? Math.min(pathValue - valueDelta, maxValue)
          : pathValue - valueDelta
    }

    await this.actor.update({ [systemPath]: newValue })
  }

  /* ---------------------------------------- */

  static async #onAddModifier(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const value = target.dataset.value ?? '0'
    const comment = target.dataset.comment ?? ''

    GURPS.ModifierBucket.addModifier(value, comment)
  }

  /* ---------------------------------------- */

  static async #onRollOtf(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const value = target.dataset.value ?? ''

    const parsed = GURPS.parselink(value)

    if (!parsed.action) return

    GURPS.performAction(parsed.action, this.actor, event)
  }

  /* ---------------------------------------- */

  static async #onEditResourceTracker(
    this: GurpsActorGcsSheet,
    event: PointerEvent,
    target: HTMLElement
  ): Promise<void> {
    event.preventDefault()

    const id = target.dataset.path

    if (!id) {
      console.error('No resource tracker id provided')

      return
    }

    const tracker = this.actor.system.additionalresources.tracker.get(id)

    if (!tracker) {
      console.error(`No resource tracker found with id ${id}`)

      return
    }

    await GURPS.modules.ResourceTracker.updateResourceTracker(this.actor, tracker)
  }

  /* ---------------------------------------- */
  /*  Drag & Drop Handling                    */
  /* ---------------------------------------- */

  protected override _onDragStart(event: DragEvent) {
    const element = event.currentTarget

    if (!isHTMLElement(element)) {
      console.error('Drag start event target is not an HTMLElement')

      return
    }

    const itemRow = element?.closest<HTMLElement>('[data-item-id]')

    if (!itemRow) {
      console.error('No item row found for drag start target')

      return
    }

    const itemId = itemRow.dataset.itemId

    if (!itemId) {
      console.error('No item id found on item row')

      return
    }

    const item = this.actor.items.get(itemId)

    if (!item) {
      console.error(`No item found with id ${itemId}`)

      return
    }

    event.dataTransfer?.setData('text/plain', JSON.stringify({ type: 'Item', id: itemId, uuid: item.uuid }))
  }

  /* ---------------------------------------- */

  protected override async _onDrop(event: DragEvent): Promise<void> {
    const data = foundry.applications.ux.TextEditor.getDragEventData(event) as DragData | null

    if (!data) return

    switch (data?.type) {
      case 'Item': {
        return this._onDropItem(event, data)
      }
    }
  }

  /* ---------------------------------------- */

  protected async _onDropItem(event: DragEvent, itemData: DragData): Promise<void> {
    const element = event.target as HTMLElement
    const targetId = element.closest<HTMLElement>('[data-item-id]')?.dataset.itemId ?? null

    const item = await fromUuid<Item.Implementation>(itemData.uuid)

    if (!item || !item.isOwner) return

    // target is the target item on which the dropped item is dropped.
    let target = targetId ? (this.actor.items.get(targetId) ?? null) : null

    if (target && target.type !== item.type) {
      ui.notifications?.warn('GURPS.dragDrop.itemTypeMismatch', { localize: true })

      return
    }

    // If the target is an item, we need to find out whether it is carried to be able to put the dragged
    // item in the right list
    let carried = true

    if (target) {
      if (target.isOfType('equipmentV2')) carried = target.system.carried
    } else {
      const tableId = element.closest<HTMLElement>('[data-table-id]')?.dataset.tableId

      carried = tableId === 'carriedEquipment'
    }

    // Decide whether the dropped item should go inside or before the target item.
    const dropPosition = target ? await resolveItemDropPosition(item) : null

    if (dropPosition === null) return

    /**
     * Begin preparing the sort update. By default, the sort siblings of the dropped item
     * are the top-level items in a given section corresponding to its item type (e.g. traits, skills, spells,
     * equipment). If the item is dropped inside another item, then the siblings are the children of the target item.
     */
    let siblings = this.actor.system.getCollectionForItemType(item.type, carried)
    let containedBy = target?.system.containedBy ?? null
    let targetContainer = target?.system.container ?? null

    if (dropPosition === 'inside') {
      // If the user selected "inside", the target item is now the container to drop the dropped item
      // into, and the new target is the first child of the container.
      containedBy = targetId
      targetContainer = target

      siblings = target?.system.children ?? []
      target = siblings[0]
    } else {
      // If the user did not select "inside", the container is the item which contains the target
      // item, and the sivlings are the children of that container. If the target item is a top-level item, then the
      // container is null and the siblings are the top-level items of the section.
      targetContainer = target?.system.container ?? null

      if (targetContainer) siblings = targetContainer.system.children
    }

    // Sort the dropped item in relation to the target item, keeping the target's siblings as siblings.
    // This should return an array containing a sort update for the dropped item.
    const sortUpdates = foundry.utils.performIntegerSort(item, { target, siblings, sortBefore: true })

    // Extract the new sort value for the dropped item from the sort updates returned by performIntegerSort
    const sort = sortUpdates.find(update => update.target._id === item.id)?.update.sort

    if (item.isOfType('equipmentV2')) {
      return this._onDropEquipment({ item, target, targetContainer, sort, containedBy, carried })
    }

    // If the item came from somewhere other than the current actor, create the item on the actor.
    if (item.actor !== this.actor) {
      const newItemData = foundry.utils.mergeObject(item.toObject(), {
        _id: foundry.utils.randomID(),
        system: { containedBy, _carried: carried },
        sort,
      })
      const newChildData = item.system.children.flatMap(child =>
        buildItemCopyWithChildren(child, newItemData._id, carried)
      )

      await this.actor.createEmbeddedDocuments('Item', [newItemData, ...newChildData])

      return
    }

    // If the target or the new parent is a child of the dropped item, we cannot move the item
    // into the target container, as that would create a circular containment relationship. In that case, we log a
    // warning and do not move the item.
    if (
      (target && item.system.containsItem(target)) ||
      (targetContainer && item.system.containsItem(targetContainer))
    ) {
      ui.notifications?.warn('GURPS.dragDrop.itemContainerLoop', { localize: true })

      return
    }

    const baseUpdate: Record<string, unknown> = {
      _id: item._id,
      'system.containedBy': containedBy,
      sort,
    }

    await this.actor.updateEmbeddedDocuments('Item', [baseUpdate])
  }

  /* ---------------------------------------- */

  protected async _onDropEquipment({
    item,
    target,
    targetContainer,
    sort,
    containedBy,
    carried,
  }: {
    item: Item.OfType<'equipmentV2'>
    target: Item.Implementation | null
    targetContainer: Item.Implementation | null
    sort: number | undefined
    containedBy: string | null
    carried: boolean
  }): Promise<void> {
    const transferredQuantity = await resolveItemDropQuantity(item)

    if (transferredQuantity === null) return

    const remainingQuantity = item.system.count - transferredQuantity

    // If the item came from a different actor, create a copy here with the transferred quantity.
    if (item.actor !== this.actor) {
      const newItemData = foundry.utils.mergeObject(item.toObject(), {
        _id: foundry.utils.randomID(),
        system: { count: transferredQuantity, containedBy, _carried: carried },
        sort,
      })
      const newChildData = item.system.children.flatMap(child =>
        buildItemCopyWithChildren(child as Item.OfType<'equipmentV2'>, newItemData._id, carried)
      )

      await this.actor.createEmbeddedDocuments('Item', [newItemData, ...newChildData], { keepId: true })

      // Remove or reduce the source item's quantity on the original actor.
      if (remainingQuantity === 0) await item.delete()
      else await item.update({ 'system.count': remainingQuantity } as Item.UpdateData)

      return
    }

    // If the target or the new parent is a child of the dropped item, we cannot move the item
    // into the target container, as that would create a circular containment relationship. In that
    // case, we log a warning and do not move the item.
    if (
      (target && item.system.containsItem(target)) ||
      (targetContainer && item.system.containsItem(targetContainer))
    ) {
      ui.notifications?.warn('GURPS.dragDrop.itemContainerLoop', { localize: true })

      return
    }

    // Update every child's carried state to match the item's new location.
    const childUpdates = item.system.children.map(child => ({ _id: child._id, 'system._carried': carried }))

    if (remainingQuantity > 0) {
      // Splitting the stack: create a new item with the transferred quantity and keep the original
      // with the remainder. Children are duplicated alongside the new item.
      const newItemData = foundry.utils.mergeObject(item.toObject(), {
        _id: foundry.utils.randomID(),
        system: { count: transferredQuantity, containedBy, _carried: carried },
        sort,
      })
      // hey
      const newChildData = item.system.children.flatMap(child =>
        buildItemCopyWithChildren(child as Item.OfType<'equipmentV2'>, newItemData._id, carried)
      )

      await this.actor.createEmbeddedDocuments('Item', [newItemData, ...newChildData], { keepId: true })
      await this.actor.updateEmbeddedDocuments('Item', [
        { _id: item._id, 'system.count': remainingQuantity } as Record<string, unknown>,
        ...childUpdates,
      ] as Item.UpdateData[])

      return
    }

    // Moving the full stack: update item and children in place.
    const baseUpdate: Record<string, unknown> = {
      _id: item._id,
      'system.containedBy': containedBy,
      'system.count': transferredQuantity,
      'system._carried': carried,
      sort,
    }

    await this.actor.updateEmbeddedDocuments('Item', [baseUpdate, ...childUpdates] as Item.UpdateData[])
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
