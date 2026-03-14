import { DisplayEquipment, DisplaySkill, DisplaySpell, DisplayTrait } from '@gurps-types/gurps/display-item.js'
import { isHTMLElement } from '@module/util/guards.js'
import { Fatigue } from '@rules/injury/fatigue.js'
import { HitPoints, ThresholdDescriptor } from '@rules/injury/hit-points.js'

import { GurpsBaseActorSheet } from './base-actor-sheet.js'
import { resolveItemDropPosition } from './helpers.js'

import ActorSheet = gurps.applications.ActorSheet

/* ---------------------------------------- */

type CharacterV2Schema = foundry.abstract.DataModel.SchemaOf<Actor.SystemOfType<'characterV2'>>

/* ---------------------------------------- */

type PoolEntry = {
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
    sortKeys: Record<string, Record<string, string>>
    attributeFields: Record<string, AttributeEntry>
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
      sortItems: GurpsActorGcsSheet.#onSortItems,
      toggleItemContainer: GurpsActorGcsSheet.#onToggleItemContainer,
      toggleItemNotes: GurpsActorGcsSheet.#onToggleItemNotes,
      addModifier: GurpsActorGcsSheet.#onAddModifier,
      rollOtf: GurpsActorGcsSheet.#onRollOtf,
    },
  }

  /* ---------------------------------------- */

  static override PARTS: Record<string, gurps.applications.handlebars.TemplatePart> = {
    header: {
      template: this.systemPath('gcs/header.hbs'),
    },
    resources: {
      template: this.systemPath('gcs/resources.hbs'),
    },
    combat: {
      template: this.systemPath('gcs/combat.hbs'),
    },
    traits: {
      template: this.systemPath('gcs/traits.hbs'),
    },
    skills: {
      template: this.systemPath('gcs/skills.hbs'),
    },
    spells: {
      template: this.systemPath('gcs/spells.hbs'),
    },
    equipment: {
      template: this.systemPath('gcs/equipment.hbs'),
    },
  }

  /* ---------------------------------------- */

  protected override async _prepareContext(
    options: ActorSheet.RenderOptions
  ): Promise<GurpsActorGcsSheet.RenderContext> {
    const superContext = await super._prepareContext(options)

    const moveModeChoices = Object.fromEntries(this.actor.system.moveV2.map(mode => [mode._id, mode.mode]))

    const sortKeys = this._prepareSortKeys()

    return {
      ...superContext,
      isPlay: this.isPlayMode,
      actor: this.actor,
      system: this.actor.system,
      systemFields: this.actor.system.schema.fields,
      systemSource: this.actor.system._source,
      moveModeChoices,
      pools: this._preparePools(),
      liftingMoving: this._prepareLiftingMoving(),
      traits: this.actor.system.adsV2.map(item => item.system.toDisplayItem()),
      skills: this.actor.system.skillsV2.map(item => item.system.toDisplayItem()),
      spells: this.actor.system.spellsV2.map(item => item.system.toDisplayItem()),
      carriedEquipment: this.actor.system.equipmentV2.carried.map(item => item.system.toDisplayItem()),
      otherEquipment: this.actor.system.equipmentV2.other.map(item => item.system.toDisplayItem()),
      attributeFields: this._prepareAttributes(),
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

    const hpThresholds = HitPoints.getThresholds(systemSource.HP.max).reverse()
    const fpThresholds = Fatigue.getThresholds(systemSource.FP.max).reverse()

    const hpState = hpThresholds.find(threshold => threshold.value >= this.actor.system.HP.value)?.condition || ''
    const fpState = fpThresholds.find(threshold => threshold.value >= this.actor.system.FP.value)?.condition || ''

    pools.push(
      {
        fields: {
          numerator: systemFields.HP.fields.damage,
          denominator: systemFields.HP.fields.max,
        },
        path: 'system.HP.damage',
        numerator: systemSource.HP.damage,
        denominator: systemSource.HP.max,
        atMax: systemSource.HP.damage === 0,
        name: 'GURPS.HP',
        state: hpState,
        thresholds: hpThresholds,
      },
      {
        fields: {
          numerator: systemFields.FP.fields.damage,
          denominator: systemFields.FP.fields.max,
        },
        path: 'system.FP.damage',
        numerator: systemSource.FP.damage,
        denominator: systemSource.FP.max,
        atMax: systemSource.FP.damage === 0,
        name: 'GURPS.FP',
        state: fpState,
        thresholds: fpThresholds,
      }
    )

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
        case 'otehrEquipment':
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

    const valueDelta = target.dataset.action === 'incrementPool' ? -1 : 1

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

    const maxPath = systemPath.replace(/\.value$/, '.max')
    const maxValue = foundry.utils.getProperty(this.actor, maxPath)
    const newValue =
      valueDelta > 0 && typeof maxValue === 'number'
        ? Math.min(pathValue - valueDelta, maxValue)
        : pathValue - valueDelta

    await this.actor.update({ [systemPath]: newValue })
  }

  /* ---------------------------------------- */

  static async #onAddModifier(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const value = target.dataset.value ?? '0'
    const comment = target.dataset.comment ?? ''

    GURPS.ModifierBucket.addModifier(value, comment)
  }

  static async #onRollOtf(this: GurpsActorGcsSheet, event: PointerEvent, target: HTMLElement): Promise<void> {
    event.preventDefault()

    const value = target.dataset.value ?? ''

    const parsed = GURPS.parselink(value)

    if (!parsed.action) return

    GURPS.performAction(parsed.action, this.actor, event)
  }

  /* ---------------------------------------- */
  /*  Drag & Drop Handling                    */
  /* ---------------------------------------- */

  protected override _onDragStart(event: DragEvent) {
    const element = event.currentTarget

    if (!isHTMLElement(element)) return

    const itemRow = element?.closest<HTMLElement>('[data-item-id]')

    if (!itemRow) return

    const itemId = itemRow.dataset.itemId

    if (!itemId) return

    const item = this.actor.items.get(itemId)

    if (!item) return

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

  // protected override _onDragOver(event: DragEvent): void {
  //   const element = event.target as HTMLElement
  // }

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

    // If the item came from somewhere other than the current actor, create the item on the actor.
    if (item.actor !== this.actor) {
      await this.actor.createEmbeddedDocuments('Item', [
        foundry.utils.mergeObject(item.toObject(), {
          sort,
          system: { containedBy, carried },
        }),
      ])

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

    // If the dropped item is an equipment container, its contents need to
    // match its carried state.
    const childUpdates = item.isOfType('equipmentV2')
      ? item.system.children.map(child => {
          return { _id: child._id, 'system._carried': carried }
        })
      : []

    await this.actor.updateEmbeddedDocuments('Item', [
      { _id: item._id, 'system.containedBy': containedBy, 'system._carried': carried, sort } as Record<string, unknown>,
      ...childUpdates,
    ])
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
