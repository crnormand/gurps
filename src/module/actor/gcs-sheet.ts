import { DisplayEquipment, DisplaySkill, DisplaySpell, DisplayTrait } from '@gurps-types/gurps/display-item.js'
import { isHTMLElement } from '@module/util/guards.js'
import { Fatigue } from '@rules/injury/fatigue.js'
import { HitPoints, ThresholdDescriptor } from '@rules/injury/hit-points.js'

import { GurpsBaseActorSheet } from './base-actor-sheet.js'

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

// NOTE: temporary, more types will be added as drag & drop functionality is implemented
type DragData = {
  type: 'Item'
  id: string
  uuid: string
}

/* ---------------------------------------- */

namespace GurpsActorGcsSheet {
  export interface RenderContext extends ActorSheet.RenderContext {
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
  }
}

/* ---------------------------------------- */

class GurpsActorGcsSheet extends GurpsBaseActorSheet<'characterV2'>() {
  // #dragItemId: string | null = null

  /* ---------------------------------------- */

  static override DEFAULT_OPTIONS: ActorSheet.Configuration = {
    classes: ['gcs-sheet'],
    position: {
      width: 800,
      height: 800,
    },
    actions: {
      incrementPool: GurpsActorGcsSheet.#onIncrementPool,
      decrementPool: GurpsActorGcsSheet.#onDecrementPool,
      sortItems: GurpsActorGcsSheet.#onSortItems,
      toggleItemContainer: GurpsActorGcsSheet.#onToggleItemContainer,
      toggleItemNotes: GurpsActorGcsSheet.#onToggleItemNotes,
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
      sortKeys,
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

  // protected override async _onRender(
  //   context: GurpsActorGcsSheet.RenderContext,
  //   options: ActorSheet.RenderOptions
  // ): Promise<void> {
  //   await super._onRender(context, options)
  //   this.#applyTraitSortIndicator()
  //   this.#bindTraitDragDrop()
  // }

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

  static async #onIncrementPool(this: GurpsActorGcsSheet, event: PointerEvent): Promise<void> {
    return this.#updatePool(event, 1)
  }

  /* ---------------------------------------- */

  static async #onDecrementPool(this: GurpsActorGcsSheet, event: PointerEvent): Promise<void> {
    return this.#updatePool(event, -1)
  }

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

  async #updatePool(event: PointerEvent, valueDelta: number): Promise<void> {
    event.preventDefault()

    const element = event.target

    if (!isHTMLElement(element)) return

    const systemPath = element.dataset.path

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
  /*  Drag & Drop Handling                    */
  /* ---------------------------------------- */

  protected override _onDragStart(event: DragEvent) {
    console.log('Drag started:', event)
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

  protected override _onDragOver(event: DragEvent): void {
    const element = event.target as HTMLElement
  }

  /* ---------------------------------------- */

  protected async _onDropItem(event: DragEvent, itemData: DragData): Promise<void> {
    const target = event.target as HTMLElement
    const newParentId = target.closest<HTMLElement>('[data-item-id]')?.dataset.itemId ?? null

    if (!newParentId) return

    const item = await fromUuid<Item.Implementation>(itemData.uuid)

    if (!item || !item.isOwner) return

    const newParent = this.actor.items.get(newParentId)

    if (!newParent) return

    if (item.actor !== this.actor) {
      await this.actor.createEmbeddedDocuments('Item', [
        foundry.utils.mergeObject(item.toObject(), {
          system: { containedBy: newParentId },
        }),
      ])

      return
    }

    if (item.system.containsItem(newParent)) {
      console.warn('Cannot move item into one of its descendants')

      return
    }

    await item.update({ 'system.containedBy': newParentId } as Record<string, unknown>)
  }
}

/* ---------------------------------------- */

export { GurpsActorGcsSheet }
